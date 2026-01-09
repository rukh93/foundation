import type { $Enums } from '@repo/prisma';

export type UpsertUserInput = {
  clerkUserId: string;
  email: string;
  phone?: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: $Enums.UserStatus;
};
