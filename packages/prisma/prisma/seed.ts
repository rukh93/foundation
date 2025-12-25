import 'dotenv/config';

import { createPrismaClient } from '../src';

const prisma = createPrismaClient(process.env.DATABASE_URL!);

async function main() {
	await prisma.language.createMany({
		data: [{ value: 'en-US' }],
		skipDuplicates: true,
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
