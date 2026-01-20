import type { $Enums } from '@repo/prisma';

export type MonthlyGrantMessage = {
  organizationId: string;
};

export type ApplyEntryInput = {
  organizationId: string;
  bucket: $Enums.CreditBucket;
  reason: $Enums.CreditLedgerReason;
  delta: number;
  idempotencyKey: string;
  featureKey?: string | null;
  jobId?: string | null;
  planVersionId?: string | null;
  actorUserId?: string | null;
};
