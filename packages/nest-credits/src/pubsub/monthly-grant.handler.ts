import { Injectable } from '@nestjs/common';
import { PrismaService } from '@repo/nest-prisma';
import { PubSubHandler } from '@repo/nest-pubsub';
import { addOneMonthUtc, isEntitledNow } from '@repo/nest-shared';
import { $Enums, Prisma } from '@repo/prisma';

import type { MonthlyGrantMessage } from '../credits.types';

@PubSubHandler('CREDITS_MONTHLY_GRANT')
@Injectable()
export class MonthlyGrantHandler {
  constructor(private readonly prismaService: PrismaService) {}

  async handle(message: MonthlyGrantMessage) {
    const organizationId = message.organizationId;

    if (!organizationId) return;

    const nowUtc = new Date();

    await this.prismaService.$transaction(async (tx) => {
      const MAX_CATCH_UP_CYCLES = 12;

      for (let i = 0; i < MAX_CATCH_UP_CYCLES; i += 1) {
        const schedule = await tx.organizationCreditSchedule.findUnique({
          where: { organizationId },
          select: {
            nextSubscriptionGrantAt: true,
          },
        });

        if (!schedule) return;

        if (schedule.nextSubscriptionGrantAt.getTime() > nowUtc.getTime()) return;

        const cycleStart = schedule.nextSubscriptionGrantAt;

        const sub = await tx.organizationSubscription.findUnique({
          where: { organizationId },
          select: {
            currentStatus: true,
            currentPlanSlug: true,
            currentPeriodEnd: true,
          },
        });

        if (!sub) return;

        if (sub.currentStatus !== $Enums.SubscriptionStatus.Active) return;

        if (!isEntitledNow(nowUtc, sub.currentPeriodEnd)) return;

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

        await this.resetSubscriptionCreditsForCycle(tx, organizationId, cycleStart);

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

        if (!handledThisCycle) return;

        const next = addOneMonthUtc(cycleStart);

        await tx.organizationCreditSchedule.update({
          where: { organizationId },
          data: {
            lastSubscriptionGrantAt: cycleStart,
            nextSubscriptionGrantAt: next,
          },
        });
      }
    });
  }

  private async resetSubscriptionCreditsForCycle(
    tx: Prisma.TransactionClient,
    organizationId: string,
    cycleStart: Date,
  ) {
    await tx.organizationCreditBalance.upsert({
      where: { organizationId },
      create: {
        organizationId,
        dailyCredits: 0,
        giftCredits: 0,
        subscriptionCredits: 0,
        purchasedCredits: 0,
      },
      update: {},
    });

    const bal = await tx.organizationCreditBalance.findUnique({
      where: { organizationId },
      select: { subscriptionCredits: true },
    });

    const currentRemaining = bal?.subscriptionCredits ?? 0;

    if (currentRemaining <= 0) return;

    const resetKey = `SUB_RESET:${organizationId}:${cycleStart.toISOString()}`;

    const existingReset = await tx.creditLedgerEntry.findFirst({
      where: { organizationId, idempotencyKey: resetKey },
      select: { id: true },
    });

    if (existingReset) return;

    await tx.creditLedgerEntry.create({
      data: {
        organizationId,
        bucket: $Enums.CreditBucket.Subscription,
        delta: -currentRemaining,
        reason: $Enums.CreditLedgerReason.SubscriptionReset,
        idempotencyKey: resetKey,
        featureKey: null,
        jobId: null,
        planVersionId: null,
        actorUserId: null,
      },
    });

    await tx.organizationCreditBalance.update({
      where: { organizationId },
      data: { subscriptionCredits: { decrement: currentRemaining } },
    });
  }
}
