import type { BillingSubscriptionWebhookEvent } from '@clerk/fastify';
import { Injectable } from '@nestjs/common';
import type { WebhookMessage } from '@repo/nest-clerk';
import {
  OrganizationId,
  organizationIdSelect,
  OrganizationSubscriptionIdAndUpdatedAt,
  organizationSubscriptionIdAndUpdatedAtSelect,
  PrismaService,
  WebhookEventData,
  webhookEventDataSelect,
} from '@repo/nest-prisma';
import { PubSubHandler } from '@repo/nest-pubsub';
import { WebhookEventService } from '@repo/nest-webhook-event';
import { $Enums, type $Enums as $EnumsType } from '@repo/prisma';

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

        const existing: OrganizationSubscriptionIdAndUpdatedAt | null = await tx.organizationSubscription.findUnique({
          where: { organizationId: organization.id },
          select: organizationSubscriptionIdAndUpdatedAtSelect,
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

        const effectiveItem = this.findEffectiveItem(payload, webhook.occurredAt);
        const mappedStatus = this.mapStatus(effectiveItem?.status);
        const derivedStatus = this.deriveAccessStatus(
          mappedStatus,
          this.startAsMs(effectiveItem?.period_start),
          this.endAsMs(effectiveItem?.period_end),
          webhook.occurredAt,
        );

        await tx.organizationSubscription.upsert({
          where: { organizationId: organization.id },
          create: {
            organizationId: organization.id,
            externalSubscriptionId: payload.data.id ?? null,
            externalSubscriptionItemId: effectiveItem?.id ?? null,
            externalSubscriptionStatus: effectiveItem?.status ?? null,
            currentPlanSlug: effectiveItem?.plan?.slug ?? null,
            currentStatus: derivedStatus,
            currentPeriodStart: this.msToDate(effectiveItem?.period_start),
            currentPeriodEnd: this.msToDate(effectiveItem?.period_end),
            externalUpdatedAt: incomingUpdatedAt,
          },
          update: {
            externalSubscriptionId: payload.data.id ?? undefined,
            externalSubscriptionItemId: effectiveItem?.id ?? undefined,
            externalSubscriptionStatus: effectiveItem?.status ?? undefined,
            currentPlanSlug: effectiveItem?.plan?.slug ?? undefined,
            currentStatus: derivedStatus,
            currentPeriodStart: this.msToDate(effectiveItem?.period_start) ?? undefined,
            currentPeriodEnd: this.msToDate(effectiveItem?.period_end) ?? undefined,
            externalUpdatedAt: incomingUpdatedAt,
          },
        });

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

  private findEffectiveItem({ data }: BillingSubscriptionWebhookEvent, occurredAt: Date) {
    const nowMs = occurredAt.getTime();

    const [current] = data.items
      .filter((i) => this.startAsMs(i.period_start) <= nowMs && nowMs < this.endAsMs(i.period_end))
      .sort((a, b) => this.startAsMs(b.period_start) - this.startAsMs(a.period_start));

    if (current) return current;

    const [upcoming] = data.items
      .filter((i) => this.startAsMs(i.period_start) > nowMs)
      .sort((a, b) => this.startAsMs(a.period_start) - this.startAsMs(b.period_start));

    if (upcoming) return upcoming;

    const [latestByStart] = data.items.sort((a, b) => this.startAsMs(b.period_start) - this.startAsMs(a.period_start));

    return latestByStart;
  }

  private deriveAccessStatus(status: $EnumsType.SubscriptionStatus, periodStart: number, periodEnd: number, occurredAt: Date) {
    const nowMs = occurredAt.getTime();
    const isCurrent = periodStart <= nowMs && nowMs < periodEnd;

    if (isCurrent) {
      return status === $Enums.SubscriptionStatus.PastDue ? $Enums.SubscriptionStatus.PastDue : $Enums.SubscriptionStatus.Active;
    }

    if (periodStart > nowMs) {
      return $Enums.SubscriptionStatus.Upcoming;
    }

    return $Enums.SubscriptionStatus.Ended;
  }
}
