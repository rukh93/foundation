import type { UserStatus } from '@repo/prisma';

export type UpsertUserInput = {
	clerkUserId: string;
	email: string;
	phone?: string;
	firstName?: string | null;
	lastName?: string | null;
	status?: UserStatus;
};
