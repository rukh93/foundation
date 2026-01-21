import type { BillingSubscriptionWebhookEvent } from '@clerk/fastify';
import { Injectable } from '@nestjs/common';
import type { WebhookMessage } from '@repo/nest-clerk';
import { PrismaService } from '@repo/nest-prisma';
import { PubSubHandler } from '@repo/nest-pubsub';
import { addOneMonthUtc } from '@repo/nest-shared';
import { WebhookEventService } from '@repo/nest-webhook-event';
import {
  $Enums,
  type $Enums as $EnumsType,
  type OrganizationId,
  organizationIdSelect,
  type OrganizationSubscriptionData,
  organizationSubscriptionDataSelect,
  Prisma,
  type WebhookEventData,
  webhookEventDataSelect,
} from '@repo/prisma';

const FREE_PLAN_CODE = 'free_org';

@PubSubHandler('WEBHOOK_SUBSCRIPTION')
@Injectable()
export class SubscriptionHandler {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  async handle(message: WebhookMessage) {
    const event: WebhookEventData | null = await this.webhookEventService.findUniqueById(message.eventId);

    if (!event || event.status === $Enums.WebhookProcessStatus.Processed) return;

    const claimed = await this.webhookEventService.markProcessing(event.id);

    if (claimed.count === 0) return;

    const payload = event.payload as unknown as BillingSubscriptionWebhookEvent;

    try {
      await this.prismaService.$transaction(async (tx) => {
        const webhook: WebhookEventData | null = await tx.webhookEvent.findUnique({
          where: { id: event.id },
          select: webhookEventDataSelect,
        });

        if (!webhook || webhook.status !== $Enums.WebhookProcessStatus.Processing) return;

        const clerkOrgId = payload.data.payer.organization_id;

        if (!clerkOrgId) {
          throw new Error('[CLERK] Subscription Webhook: missing data.payer.organization_id');
        }

        const incomingUpdatedAt = new Date(payload.data.updated_at);

        const organization: OrganizationId | null = await tx.organization.findUnique({
          where: { clerkOrgId },
          select: organizationIdSelect,
        });

        if (!organization) {
          throw new Error(`[CLERK] Subscription Webhook: organization not found for clerkOrgId=${clerkOrgId}`);
        }

        const existing: OrganizationSubscriptionData | null = await tx.organizationSubscription.findUnique({
          where: { organizationId: organization.id },
          select: organizationSubscriptionDataSelect,
        });

        if (existing?.externalUpdatedAt && incomingUpdatedAt.getTime() <= existing.externalUpdatedAt.getTime()) {
          await tx.webhookEvent.update({
            where: { id: webhook.id },
            data: {
              status: $Enums.WebhookProcessStatus.Processed,
              processedAt: new Date(),
              errorMessage: null,
            },
          });

          return;
        }

        const items = Array.isArray(payload.data.items) ? payload.data.items : [];

        if (items.length === 0) {
          throw new Error('[CLERK] Subscription Webhook: event has no items');
        }

        const nowUtc = new Date();

        const currentItem = this.findCurrentItem(payload, nowUtc);

        const currentPlanSlug = currentItem?.plan?.slug ?? FREE_PLAN_CODE;
        const periodStartToDate = this.msToDate(currentItem?.period_start);
        const periodEndToDate = this.msToDate(currentItem?.period_end);

        const mappedStatus = this.mapStatus(currentItem?.status);

        const derivedStatus = currentItem
          ? this.deriveAccessStatus(
              mappedStatus,
              this.startAsMs(currentItem?.period_start),
              this.endAsMs(currentItem?.period_end),
              nowUtc,
            )
          : $Enums.SubscriptionStatus.Active;

        const oldStatus = existing?.currentStatus ?? null;
        const oldPlan = existing?.currentPlanSlug ?? null;

        const planDowngradedToFree = !!oldPlan && oldPlan !== FREE_PLAN_CODE && currentPlanSlug === FREE_PLAN_CODE;

        await tx.organizationSubscription.upsert({
          where: { organizationId: organization.id },
          create: {
            organizationId: organization.id,
            externalSubscriptionId: payload.data.id ?? null,
            externalSubscriptionItemId: currentItem?.id ?? null,
            externalSubscriptionStatus: currentItem?.status ?? null,
            currentPlanSlug,
            currentStatus: derivedStatus,
            currentPeriodStart: periodStartToDate,
            currentPeriodEnd: periodEndToDate,
            externalUpdatedAt: incomingUpdatedAt,
          },
          update: {
            externalSubscriptionId: payload.data.id ?? undefined,
            externalSubscriptionItemId: currentItem?.id ?? undefined,
            externalSubscriptionStatus: currentItem?.status ?? undefined,
            currentPlanSlug: currentPlanSlug ?? undefined,
            currentStatus: derivedStatus,
            currentPeriodStart: periodStartToDate ?? undefined,
            currentPeriodEnd: periodEndToDate ?? undefined,
            externalUpdatedAt: incomingUpdatedAt,
          },
        });

        if (!planDowngradedToFree) {
          await this.ensureInitialSubscriptionCredits(tx, {
            organizationId: organization.id,
            derivedStatus,
            planCode: currentPlanSlug,
            anchorAt: periodStartToDate ?? nowUtc,
          });
        }

        await this.applyUpgradeCreditAdjustmentIfNeeded(tx, {
          organizationId: organization.id,
          webhookEventId: webhook.id,
          derivedStatus,
          oldPlanCode: oldPlan,
          newPlanCode: currentPlanSlug,
        });

        await this.applyDowngradeClampToFreeIfNeeded(tx, {
          organizationId: organization.id,
          webhookEventId: webhook.id,
          oldPlanCode: oldPlan,
          newPlanCode: currentPlanSlug,
        });

        const becameActive =
          oldStatus !== $Enums.SubscriptionStatus.Active && derivedStatus === $Enums.SubscriptionStatus.Active;

        const planChanged = !!oldPlan && !!currentPlanSlug && oldPlan !== currentPlanSlug;

        if (!planDowngradedToFree && (becameActive || planChanged)) {
          await this.grantMonthlyCatchUpIfDue(tx, {
            organizationId: organization.id,
            nowUtc,
            maxCycles: 12,
          });
        }

        await tx.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: $Enums.WebhookProcessStatus.Processed,
            processedAt: new Date(),
            errorMessage: null,
          },
        });
      });
    } catch (error) {
      await this.webhookEventService.markFailed(event.id, String(error).slice(0, 2000));

      throw error;
    }
  }

  private async grantMonthlyCatchUpIfDue(
    tx: Prisma.TransactionClient,
    input: { organizationId: string; nowUtc: Date; maxCycles: number },
  ) {
    const { organizationId, nowUtc, maxCycles } = input;

    for (let i = 0; i < maxCycles; i += 1) {
      const schedule = await tx.organizationCreditSchedule.findUnique({
        where: { organizationId },
        select: { nextSubscriptionGrantAt: true },
      });

      if (!schedule) return;
      if (schedule.nextSubscriptionGrantAt.getTime() > nowUtc.getTime()) return;

      const cycleStart = schedule.nextSubscriptionGrantAt;

      const sub = await tx.organizationSubscription.findUnique({
        where: { organizationId },
        select: { currentStatus: true, currentPlanSlug: true, currentPeriodEnd: true },
      });

      if (!sub) return;

      if (sub.currentStatus !== $Enums.SubscriptionStatus.Active) return;

      if (sub.currentPeriodEnd instanceof Date) {
        if (nowUtc.getTime() >= sub.currentPeriodEnd.getTime()) return;
      }

      const planCode = sub.currentPlanSlug;

      if (!planCode) return;

      const plan = await tx.plan.findUnique({
        where: { code: planCode },
        select: { id: true, isActive: true },
      });

      if (!plan || !plan.isActive) return;

      const planVersion = await tx.planVersion.findFirst({
        where: {
          planId: plan.id,
          isActive: true,
          effectiveFrom: { lte: cycleStart },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: cycleStart } }],
        },
        orderBy: { effectiveFrom: 'desc' },
        select: { id: true, monthlyCredits: true },
      });

      if (!planVersion) return;

      const creditsToGrant = planVersion.monthlyCredits ?? 0;

      await tx.organizationCreditBalance.upsert({
        where: { organizationId },
        create: { organizationId, dailyCredits: 0, subscriptionCredits: 0, purchasedCredits: 0 },
        update: {},
      });

      const idempotencyKey = `SUB_GRANT:${organizationId}:${cycleStart.toISOString()}`;

      let handled = false;

      if (creditsToGrant > 0) {
        try {
          await tx.creditLedgerEntry.create({
            data: {
              organizationId,
              bucket: $Enums.CreditBucket.Subscription,
              delta: creditsToGrant,
              reason: $Enums.CreditLedgerReason.SubscriptionGrant,
              idempotencyKey,
              planVersionId: planVersion.id,
            },
          });

          await tx.organizationCreditBalance.update({
            where: { organizationId },
            data: { subscriptionCredits: { increment: creditsToGrant } },
          });

          handled = true;
        } catch (error: unknown) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            handled = true; // already granted
          } else {
            throw error; // retry
          }
        }
      } else {
        handled = true;
      }

      if (!handled) return;

      const next = addOneMonthUtc(cycleStart);

      await tx.organizationCreditSchedule.update({
        where: { organizationId },
        data: {
          lastSubscriptionGrantAt: cycleStart,
          nextSubscriptionGrantAt: next,
        },
      });
    }
  }

  private async ensureInitialSubscriptionCredits(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      derivedStatus: $Enums.SubscriptionStatus;
      planCode: string | null;
      anchorAt: Date;
    },
  ) {
    const { organizationId, derivedStatus, planCode, anchorAt } = input;

    await tx.organizationCreditBalance.upsert({
      where: { organizationId },
      create: {
        organizationId,
        dailyCredits: 0,
        subscriptionCredits: 0,
        purchasedCredits: 0,
      },
      update: {},
    });

    if (derivedStatus !== $Enums.SubscriptionStatus.Active) return;

    if (!planCode) return;

    const nowUtc = new Date();

    const schedule = await tx.organizationCreditSchedule.upsert({
      where: { organizationId },
      create: {
        organizationId,
        subscriptionAnchorAt: anchorAt,
        nextSubscriptionGrantAt: anchorAt,
        lastSubscriptionGrantAt: null,
      },
      update: {},
    });

    if (schedule.nextSubscriptionGrantAt.getTime() > nowUtc.getTime()) return;

    const cycleStart = schedule.nextSubscriptionGrantAt;

    const plan = await tx.plan.findUnique({
      where: { code: planCode },
      select: { id: true, isActive: true },
    });

    if (!plan || !plan.isActive) {
      throw new Error(`[CREDITS]: Plan not found/disabled: ${planCode}`);
    }

    const planVersion = await tx.planVersion.findFirst({
      where: {
        planId: plan.id,
        isActive: true,
        effectiveFrom: { lte: cycleStart },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: cycleStart } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { id: true, monthlyCredits: true },
    });

    if (!planVersion) {
      throw new Error(`[CREDITS] PlanVersion not found for plan=${planCode} at=${cycleStart.toISOString()}`);
    }

    const creditsToGrant = planVersion.monthlyCredits ?? 0;
    const idempotencyKey = `SUB_GRANT:${organizationId}:${cycleStart.toISOString()}`;

    let handledThisCycle = false;

    if (creditsToGrant > 0) {
      try {
        await tx.creditLedgerEntry.create({
          data: {
            organizationId,
            bucket: $Enums.CreditBucket.Subscription,
            delta: creditsToGrant,
            reason: $Enums.CreditLedgerReason.SubscriptionGrant,
            idempotencyKey,
            planVersionId: planVersion.id,
          },
        });

        await tx.organizationCreditBalance.update({
          where: { organizationId },
          data: { subscriptionCredits: { increment: creditsToGrant } },
        });

        handledThisCycle = true;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          handledThisCycle = true;
        } else {
          throw error;
        }
      }
    } else {
      handledThisCycle = true;
    }

    if (handledThisCycle) {
      const currentSchedule = await tx.organizationCreditSchedule.findUnique({
        where: { organizationId },
        select: { nextSubscriptionGrantAt: true },
      });

      if (currentSchedule?.nextSubscriptionGrantAt?.getTime() === cycleStart.getTime()) {
        const next = addOneMonthUtc(cycleStart);

        await tx.organizationCreditSchedule.update({
          where: { organizationId },
          data: {
            lastSubscriptionGrantAt: cycleStart,
            nextSubscriptionGrantAt: next,
          },
        });
      }
    }
  }

  private async applyDowngradeClampToFreeIfNeeded(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      webhookEventId: string;
      oldPlanCode: string | null;
      newPlanCode: string;
    },
  ) {
    const { organizationId, webhookEventId, oldPlanCode, newPlanCode } = input;

    if (!oldPlanCode) return;

    if (oldPlanCode === FREE_PLAN_CODE) return;

    if (newPlanCode !== FREE_PLAN_CODE) return;

    const schedule = await tx.organizationCreditSchedule.findUnique({
      where: { organizationId },
      select: {
        subscriptionAnchorAt: true,
        lastSubscriptionGrantAt: true,
        nextSubscriptionGrantAt: true,
      },
    });

    if (!schedule) return;

    const cycleStart = schedule.lastSubscriptionGrantAt ?? schedule.subscriptionAnchorAt;
    const cycleEnd = schedule.nextSubscriptionGrantAt;

    if (cycleEnd.getTime() <= cycleStart.getTime()) return;

    const freeAlloc = await this.resolveMonthlyCreditsForPlanAt(tx, FREE_PLAN_CODE, cycleStart);

    const usedAgg = await tx.creditLedgerEntry.aggregate({
      where: {
        organizationId,
        bucket: $Enums.CreditBucket.Subscription,
        delta: { lt: 0 },
        createdAt: { gte: cycleStart, lt: cycleEnd },
        // reason: $Enums.CreditLedgerReason.JobBurn,
      },
      _sum: { delta: true },
    });

    const used = Math.abs(usedAgg._sum.delta ?? 0);
    const targetRemaining = Math.max(0, freeAlloc - used);

    await tx.organizationCreditBalance.upsert({
      where: { organizationId },
      create: { organizationId, dailyCredits: 0, subscriptionCredits: 0, purchasedCredits: 0 },
      update: {},
    });

    const balance = await tx.organizationCreditBalance.findUnique({
      where: { organizationId },
      select: { subscriptionCredits: true },
    });

    const currentRemaining = balance?.subscriptionCredits ?? 0;

    if (currentRemaining <= targetRemaining) return;

    const clampAmount = currentRemaining - targetRemaining;

    const idempotencyKey = `DOWNGRADE_CLAMP:${organizationId}:${webhookEventId}`;

    const already = await tx.creditLedgerEntry.findFirst({
      where: { organizationId, idempotencyKey },
      select: { id: true },
    });

    if (already) return;

    await tx.creditLedgerEntry.create({
      data: {
        organizationId,
        bucket: $Enums.CreditBucket.Subscription,
        delta: -clampAmount,
        reason: $Enums.CreditLedgerReason.PlanDowngradeClamp,
        idempotencyKey,
        featureKey: null,
        jobId: null,
        planVersionId: null,
        actorUserId: null,
      },
    });

    await tx.organizationCreditBalance.update({
      where: { organizationId },
      data: { subscriptionCredits: { decrement: clampAmount } },
    });
  }

  private async applyUpgradeCreditAdjustmentIfNeeded(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      webhookEventId: string;
      derivedStatus: $Enums.SubscriptionStatus;
      oldPlanCode: string | null;
      newPlanCode: string | null;
    },
  ) {
    const { organizationId, webhookEventId, derivedStatus, oldPlanCode, newPlanCode } = input;

    if (derivedStatus !== $Enums.SubscriptionStatus.Active) return;

    if (!oldPlanCode || !newPlanCode) return;

    if (oldPlanCode === newPlanCode) return;

    if (newPlanCode === FREE_PLAN_CODE) return;

    const schedule = await tx.organizationCreditSchedule.findUnique({
      where: { organizationId },
      select: {
        subscriptionAnchorAt: true,
        lastSubscriptionGrantAt: true,
        nextSubscriptionGrantAt: true,
      },
    });

    if (!schedule) return;

    const cycleStart = schedule.lastSubscriptionGrantAt ?? schedule.subscriptionAnchorAt;
    const cycleEnd = schedule.nextSubscriptionGrantAt;

    if (cycleEnd.getTime() <= cycleStart.getTime()) return;

    const [oldAlloc, newAlloc] = await Promise.all([
      this.resolveMonthlyCreditsForPlanAt(tx, oldPlanCode, cycleStart),
      this.resolveMonthlyCreditsForPlanAt(tx, newPlanCode, cycleStart),
    ]);

    if (newAlloc <= oldAlloc) return;

    const idempotencyKey = `UPGRADE_ADJUST:${organizationId}:${webhookEventId}`;

    const existingAdj = await tx.creditLedgerEntry.findFirst({
      where: { organizationId, idempotencyKey },
      select: { id: true },
    });

    if (existingAdj) return;

    const usedAgg = await tx.creditLedgerEntry.aggregate({
      where: {
        organizationId,
        bucket: $Enums.CreditBucket.Subscription,
        delta: { lt: 0 },
        createdAt: { gte: cycleStart, lt: cycleEnd },
        // reason: $Enums.CreditLedgerReason.JobBurn,
      },
      _sum: { delta: true },
    });

    const used = Math.abs(usedAgg._sum.delta ?? 0);
    const targetRemaining = Math.max(0, newAlloc - used);

    await tx.organizationCreditBalance.upsert({
      where: { organizationId },
      create: { organizationId, dailyCredits: 0, subscriptionCredits: 0, purchasedCredits: 0 },
      update: {},
    });

    const balance = await tx.organizationCreditBalance.findUnique({
      where: { organizationId },
      select: { subscriptionCredits: true },
    });

    const currentRemaining = balance?.subscriptionCredits ?? 0;
    const grantNow = Math.max(0, targetRemaining - currentRemaining);

    if (grantNow <= 0) return;

    await tx.creditLedgerEntry.create({
      data: {
        organizationId,
        bucket: $Enums.CreditBucket.Subscription,
        delta: grantNow,
        reason: $Enums.CreditLedgerReason.PlanUpgradeAdjustment,
        idempotencyKey,
        featureKey: null,
        jobId: null,
        planVersionId: null,
        actorUserId: null,
      },
    });

    await tx.organizationCreditBalance.update({
      where: { organizationId },
      data: { subscriptionCredits: { increment: grantNow } },
    });
  }

  private async resolveMonthlyCreditsForPlanAt(
    tx: Prisma.TransactionClient,
    planCode: string,
    at: Date,
  ): Promise<number> {
    const plan = await tx.plan.findUnique({
      where: { code: planCode },
      select: { id: true, isActive: true },
    });

    if (!plan || !plan.isActive) return 0;

    const pv = await tx.planVersion.findFirst({
      where: {
        planId: plan.id,
        isActive: true,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { monthlyCredits: true },
    });

    return pv?.monthlyCredits ?? 0;
  }

  private msToDate(v?: number | null): Date | null {
    return typeof v === 'number' ? new Date(v) : null;
  }

  private mapStatus(raw?: string): $EnumsType.SubscriptionStatus {
    const mappedStatuses: Record<string, $EnumsType.SubscriptionStatus> = {
      active: $Enums.SubscriptionStatus.Active,
      past_due: $Enums.SubscriptionStatus.PastDue,
      canceled: $Enums.SubscriptionStatus.Canceled,
      ended: $Enums.SubscriptionStatus.Ended,
      upcoming: $Enums.SubscriptionStatus.Upcoming,
      abandoned: $Enums.SubscriptionStatus.Abandoned,
      incomplete: $Enums.SubscriptionStatus.Incomplete,
      expired: $Enums.SubscriptionStatus.Expired,
    };

    return mappedStatuses[raw ?? ''] ?? $Enums.SubscriptionStatus.Incomplete;
  }

  private endAsMs(v?: number | null) {
    if (typeof v !== 'number') return Number.POSITIVE_INFINITY;

    if (v <= 0) return Number.POSITIVE_INFINITY;

    return v;
  }

  private startAsMs(v?: number | null) {
    return typeof v === 'number' ? v : 0;
  }

  private findCurrentItem({ data }: BillingSubscriptionWebhookEvent, refTime: Date) {
    const nowMs = refTime.getTime();

    const [current] = data.items
      .filter((i) => this.startAsMs(i.period_start) <= nowMs && nowMs < this.endAsMs(i.period_end))
      .sort((a, b) => this.startAsMs(b.period_start) - this.startAsMs(a.period_start));

    return current ?? null;
  }

  private deriveAccessStatus(
    status: $EnumsType.SubscriptionStatus,
    periodStart: number,
    periodEnd: number,
    refTime: Date,
  ) {
    const nowMs = refTime.getTime();
    const isCurrent = periodStart <= nowMs && nowMs < periodEnd;

    if (isCurrent) {
      return status === $Enums.SubscriptionStatus.PastDue
        ? $Enums.SubscriptionStatus.PastDue
        : $Enums.SubscriptionStatus.Active;
    }

    if (periodStart > nowMs) return $Enums.SubscriptionStatus.Upcoming;

    return $Enums.SubscriptionStatus.Ended;
  }
}
