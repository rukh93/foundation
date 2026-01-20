import 'dotenv/config';

import { PubSub } from '@google-cloud/pubsub';
import { createPrismaClient, type OrganizationCreditScheduleData, organizationCreditScheduleData } from '@repo/prisma';

import { CREDITS_MONTHLY_GRANT } from './constants';
import type { GrantDispatchMessage } from './types';

const prisma = createPrismaClient(process.env.DATABASE_URL!);

async function main() {
  const topicName = process.env.PUBSUB_TOPIC_NAME_SUB_GRANTS!;
  const raw = process.env.CREDITS_SCHEDULER_BATCH_SIZE;
  const n = Number(raw);
  const batchSize = Number.isFinite(n) && n > 0 ? Math.floor(n) : 500;
  const dryRun = process.env.CREDITS_SCHEDULER_DRY_RUN === 'true';

  const nowUtc = new Date();
  const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });

  const topic = pubsub.topic(topicName, {
    batching: {
      maxMessages: 500,
      maxMilliseconds: 200,
    },
  });

  console.log(
    JSON.stringify({
      msg: 'credits_scheduler.start',
      nowUtc: nowUtc.toISOString(),
      topicName,
      batchSize,
      dryRun,
    }),
  );

  let lastNextAt: Date | null = null;
  let lastId: string | null = null;

  let scanned = 0;
  let eligible = 0;
  let published = 0;

  const publishPromises: Array<Promise<string>> = [];
  const dispatchedAt = nowUtc.toISOString();

  while (true) {
    const page: OrganizationCreditScheduleData[] = await prisma.organizationCreditSchedule.findMany({
      where: {
        nextSubscriptionGrantAt: { lte: nowUtc },
        ...(lastNextAt && lastId
          ? {
              OR: [
                { nextSubscriptionGrantAt: { gt: lastNextAt } },
                { nextSubscriptionGrantAt: lastNextAt, id: { gt: lastId } },
              ],
            }
          : {}),
      },
      orderBy: [{ nextSubscriptionGrantAt: 'asc' }, { id: 'asc' }],
      take: batchSize,
      select: organizationCreditScheduleData,
    });

    if (page.length === 0) break;

    for (const row of page) {
      scanned += 1;
      lastNextAt = row.nextSubscriptionGrantAt;
      lastId = row.id;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const sub = row.organization?.subscription;
      const status = sub?.currentStatus ?? null;
      const periodEnd = sub?.currentPeriodEnd ?? null;

      const isActive = status === 'Active';
      const hasAccessNow = isActive && (!(periodEnd instanceof Date) || nowUtc.getTime() < periodEnd.getTime());

      if (!hasAccessNow) continue;

      eligible += 1;

      if (dryRun) {
        console.log(
          JSON.stringify({
            msg: 'credits_scheduler.dry_run_publish',
            organizationId: row.organizationId,
            dueAt: row.nextSubscriptionGrantAt.toISOString(),
          }),
        );

        published += 1;
        continue;
      }

      const message: GrantDispatchMessage = {
        kind: CREDITS_MONTHLY_GRANT,
        organizationId: row.organizationId,
        dispatchedAt,
      };

      publishPromises.push(
        topic.publishMessage({
          json: message,
          attributes: {
            kind: message.kind,
            organizationId: message.organizationId,
          },
        }),
      );

      published += 1;
    }

    if (page.length < batchSize) break;
  }

  if (!dryRun && publishPromises.length > 0) {
    await Promise.all(publishPromises);
  }

  console.log(
    JSON.stringify({
      msg: 'credits_scheduler.done',
      nowUtc: nowUtc.toISOString(),
      scanned,
      eligible,
      published,
    }),
  );
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({
        msg: 'credits_scheduler.error',
        error: err instanceof Error ? err.stack || err.message : String(err),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
