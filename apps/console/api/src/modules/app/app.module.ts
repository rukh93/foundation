import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClerkModule } from '@repo/nest-clerk';
import { LanguageModule } from '@repo/nest-language';
import { OrganizationModule } from '@repo/nest-organization';
import { OrganizationMembershipModule } from '@repo/nest-organization-membership';
import { PrismaModule } from '@repo/nest-prisma';
import { RabbitmqModule } from '@repo/nest-rabbitmq';
import { RedisCacheModule } from '@repo/nest-redis-cache';
import { SharedModule } from '@repo/nest-shared';
import { UserModule } from '@repo/nest-user';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		EventEmitterModule.forRoot(),
		RedisCacheModule.forRoot(),
		RabbitmqModule,
		SharedModule,
		PrismaModule,
		LanguageModule,
		ClerkModule,
		UserModule,
		OrganizationModule,
		OrganizationMembershipModule,
	],
})
export class AppModule {}
