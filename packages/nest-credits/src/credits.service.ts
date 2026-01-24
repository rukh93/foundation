import { Injectable } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { PrismaService } from '@repo/nest-prisma';
import { $Enums, type OrganizationCreditBalance } from '@repo/prisma';

@Injectable()
export class CreditsService {
  constructor(private readonly prismaService: PrismaService) {}

  async apply(
    user: FastifyUser,
    delta: number,
    featureKey: string,
    idempotencyKey: string,
  ): Promise<OrganizationCreditBalance | null> {
    const { orgId } = user;

    return this.prismaService.$transaction(async (tx) => {
      await tx.organizationCreditBalance.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          dailyCredits: 0,
          subscriptionCredits: 0,
          giftCredits: 0,
          purchasedCredits: 0,
        },
        update: {},
      });

      const existing = await tx.creditLedgerEntry.findFirst({
        where: { organizationId: orgId, idempotencyKey },
        select: { id: true },
      });

      if (existing) {
        return tx.organizationCreditBalance.findUnique({ where: { organizationId: orgId } });
      }

      if (delta > 0) {
        await tx.creditLedgerEntry.create({
          data: {
            organizationId: orgId,
            bucket: $Enums.CreditBucket.Subscription,
            delta,
            reason: $Enums.CreditLedgerReason.SubscriptionGrant,
            idempotencyKey,
            featureKey,
            jobId: null,
            planVersionId: null,
            actorUserId: null,
          },
        });

        return tx.organizationCreditBalance.update({
          where: { organizationId: orgId },
          data: { subscriptionCredits: { increment: delta } },
        });
      }

      if (delta === 0) {
        return tx.organizationCreditBalance.findUnique({ where: { organizationId: orgId } });
      }

      const burnAmount = Math.abs(delta);

      const bal = await tx.organizationCreditBalance.findUnique({
        where: { organizationId: orgId },
        select: { subscriptionCredits: true, giftCredits: true },
      });

      const sub = bal?.subscriptionCredits ?? 0;
      const gift = bal?.giftCredits ?? 0;

      const fromSub = Math.min(sub, burnAmount);
      const remaining = burnAmount - fromSub;
      const fromGift = Math.min(gift, remaining);

      if (fromSub + fromGift < burnAmount) {
        throw new Error(
          `Insufficient credits: need=${burnAmount}, available=${fromSub + fromGift} (sub=${sub}, gift=${gift})`,
        );
      }

      if (fromSub > 0) {
        await tx.creditLedgerEntry.create({
          data: {
            organizationId: orgId,
            bucket: $Enums.CreditBucket.Subscription,
            delta: -fromSub,
            reason: $Enums.CreditLedgerReason.JobBurn,
            idempotencyKey: `${idempotencyKey}:sub`,
            featureKey,
            jobId: null,
            planVersionId: null,
            actorUserId: null,
          },
        });
      }

      if (fromGift > 0) {
        await tx.creditLedgerEntry.create({
          data: {
            organizationId: orgId,
            bucket: $Enums.CreditBucket.Gift,
            delta: -fromGift,
            reason: $Enums.CreditLedgerReason.JobBurn,
            idempotencyKey: `${idempotencyKey}:gift`,
            featureKey,
            jobId: null,
            planVersionId: null,
            actorUserId: null,
          },
        });
      }

      return tx.organizationCreditBalance.update({
        where: { organizationId: orgId },
        data: {
          subscriptionCredits: fromSub > 0 ? { decrement: fromSub } : undefined,
          giftCredits: fromGift > 0 ? { decrement: fromGift } : undefined,
        },
      });
    });
  }
}
