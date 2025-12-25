import { PrismaClient } from './generated/client';
import { createPrismaClient } from './runtime';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
