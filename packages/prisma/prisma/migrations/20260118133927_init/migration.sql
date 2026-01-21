-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('Admin', 'Member');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Active', 'Banned', 'Locked');

-- CreateEnum
CREATE TYPE "WebhookProvider" AS ENUM ('Clerk', 'Stripe');

-- CreateEnum
CREATE TYPE "WebhookProcessStatus" AS ENUM ('Received', 'Processed', 'Processing', 'Failed');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('Clerk', 'Manual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'PastDue', 'Canceled', 'Incomplete', 'Ended', 'Upcoming', 'Abandoned', 'Expired');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('Monthly', 'Quarterly', 'Annual');

-- CreateEnum
CREATE TYPE "CreditBucket" AS ENUM ('Daily', 'Subscription', 'Purchased');

-- CreateEnum
CREATE TYPE "CreditLedgerReason" AS ENUM ('DailyGrant', 'SubscriptionGrant', 'CreditPackPurchase', 'CreditPackRefund', 'JobBurn', 'ManualAdjustment', 'PlanUpgradeAdjustment', 'PlanDowngradeClamp');

-- CreateTable
CREATE TABLE "Language" (
    "id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "languageId" UUID,
    "status" "UserStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL,
    "clerkOrgMemId" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'Member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSubscription" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL DEFAULT 'Clerk',
    "externalSubscriptionId" TEXT,
    "externalSubscriptionItemId" TEXT,
    "externalSubscriptionStatus" TEXT,
    "externalUpdatedAt" TIMESTAMP(3),
    "currentPlanSlug" TEXT,
    "currentStatus" "SubscriptionStatus" NOT NULL DEFAULT 'Incomplete',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationCreditBalance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "dailyCredits" INTEGER NOT NULL DEFAULT 0,
    "subscriptionCredits" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationCreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationCreditSchedule" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "subscriptionAnchorAt" TIMESTAMP(3) NOT NULL,
    "nextSubscriptionGrantAt" TIMESTAMP(3) NOT NULL,
    "lastSubscriptionGrantAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationCreditSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "bucket" "CreditBucket" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditLedgerReason" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "featureKey" TEXT,
    "jobId" UUID,
    "planVersionId" UUID,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "provider" "WebhookProvider" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WebhookProcessStatus" NOT NULL DEFAULT 'Received',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "dailyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyGrantCredits" INTEGER NOT NULL DEFAULT 0,
    "dailyMonthlyCapCredits" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_value_key" ON "Language"("value");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_clerkOrgMemId_key" ON "OrganizationMembership"("clerkOrgMemId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_externalSubscriptionId_key" ON "OrganizationSubscription"("externalSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_externalSubscriptionItemId_key" ON "OrganizationSubscription"("externalSubscriptionItemId");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_currentPlanSlug_idx" ON "OrganizationSubscription"("currentPlanSlug");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_currentStatus_idx" ON "OrganizationSubscription"("currentStatus");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_externalUpdatedAt_idx" ON "OrganizationSubscription"("externalUpdatedAt");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_provider_idx" ON "OrganizationSubscription"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCreditBalance_organizationId_key" ON "OrganizationCreditBalance"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationCreditBalance_organizationId_idx" ON "OrganizationCreditBalance"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCreditSchedule_organizationId_key" ON "OrganizationCreditSchedule"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationCreditSchedule_nextSubscriptionGrantAt_idx" ON "OrganizationCreditSchedule"("nextSubscriptionGrantAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_organizationId_createdAt_idx" ON "CreditLedgerEntry"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_organizationId_bucket_idx" ON "CreditLedgerEntry"("organizationId", "bucket");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_jobId_idx" ON "CreditLedgerEntry"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedgerEntry_organizationId_idempotencyKey_key" ON "CreditLedgerEntry"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_occurredAt_idx" ON "WebhookEvent"("provider", "occurredAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalEventId_key" ON "WebhookEvent"("provider", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "PlanVersion_planId_effectiveFrom_idx" ON "PlanVersion"("planId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PlanVersion_effectiveFrom_idx" ON "PlanVersion"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_effectiveFrom_key" ON "PlanVersion"("planId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCreditBalance" ADD CONSTRAINT "OrganizationCreditBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCreditSchedule" ADD CONSTRAINT "OrganizationCreditSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
