import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import dotenv from 'dotenv';

import { createPrismaClient } from '../src';

const rootEnvPath = resolve(__dirname, '../../../.env');

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const prisma = createPrismaClient(process.env.DATABASE_URL!);

async function main() {
  await prisma.language.create({
    data: {
      value: 'en-US',
    },
  });

  const [freePlan, coachPlan, clubPlan] = await Promise.all([
    prisma.plan.create({ data: { code: 'free_org', name: 'Free', isActive: true } }),
    prisma.plan.create({ data: { code: 'coach', name: 'Coach', isActive: true } }),
    prisma.plan.create({ data: { code: 'club', name: 'Club', isActive: true } }),
  ]);

  const creationDate = new Date();

  await prisma.planVersion.createMany({
    data: [
      {
        planId: freePlan.id,
        effectiveFrom: creationDate,
        isActive: true,
        monthlyCredits: 40,
        dailyEnabled: true,
        dailyGrantCredits: 5,
        dailyMonthlyCapCredits: 30,
      },
      {
        planId: coachPlan.id,
        effectiveFrom: creationDate,
        isActive: true,
        monthlyCredits: 120,
        dailyEnabled: true,
        dailyGrantCredits: 5,
        dailyMonthlyCapCredits: 150,
      },
      {
        planId: clubPlan.id,
        effectiveFrom: creationDate,
        isActive: true,
        monthlyCredits: 1000,
        dailyEnabled: true,
        dailyGrantCredits: 5,
        dailyMonthlyCapCredits: 300,
      },
    ],
  });
}

main()
  .then(async () => {
    console.log('Seeding complete.');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
