import type { FastifyRequest } from 'fastify';

export type FastifyUser = {
  clerkUserId: string;
  clerkOrgId: string;
  userId: string;
  orgId: string;
  orgMemId: string;
};

export type FastifyRequestWithUser<U = FastifyUser> = FastifyRequest & { user: U };
