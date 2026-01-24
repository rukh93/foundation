import { Injectable } from '@nestjs/common';
import type { FastifyUser } from '@repo/nest-clerk';
import { PrismaService } from '@repo/nest-prisma';
import { $Enums, type OrganizationCreditBalance } from '@repo/prisma';

@Injectable()
export class CreditsService {
  constructor(private readonly prismaService: PrismaService) {}

  async apply(user: FastifyUser, delta: number, featureKey: string): Promise<OrganizationCreditBalance | undefined> {
    const { orgId } = user;

    // eslint-disable-next-line max-len
    const idempotencyKey = `${featureKey}:${delta >= 0 ? 'grant' : 'burn'}:${Math.abs(delta)}:${new Date().toISOString()}`;

    return this.prismaService.$transaction(async (tx) => {
      await tx.organizationCreditBalance.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          dailyCredits: 0,
          subscriptionCredits: 0,
          purchasedCredits: 0,
        },
        update: {},
      });

      const existing = await tx.creditLedgerEntry.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });

      if (existing) return;

      await tx.creditLedgerEntry.create({
        data: {
          organizationId: orgId,
          bucket: $Enums.CreditBucket.Subscription,
          delta,
          reason: $Enums.CreditLedgerReason.JobBurn,
          idempotencyKey,
          featureKey,
          jobId: null,
          planVersionId: null,
          actorUserId: null,
        },
      });

      return tx.organizationCreditBalance.update({
        where: { organizationId: orgId },
        data: {
          subscriptionCredits: delta >= 0 ? { increment: delta } : { decrement: Math.abs(delta) },
        },
      });
    });
  }
}
