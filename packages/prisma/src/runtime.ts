import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client';

export function createPrismaAdapter(connectionString: string) {
	if (!connectionString) {
		throw new Error('DATABASE_URL is missing');
	}

	return new PrismaPg({ connectionString });
}

export function createPrismaClient(connectionString: string) {
	const adapter = createPrismaAdapter(connectionString);

	return new PrismaClient({ adapter });
}
