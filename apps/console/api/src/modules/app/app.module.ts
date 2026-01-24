import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkModule } from '@repo/nest-clerk';
import { ClerkBillingModule } from '@repo/nest-clerk-billing';
import { CreditsModule } from '@repo/nest-credits';
import { LanguageModule } from '@repo/nest-language';
import { OrganizationModule } from '@repo/nest-organization';
import { OrganizationMembershipModule } from '@repo/nest-organization-membership';
import { PrismaModule } from '@repo/nest-prisma';
import { PubSubModule } from '@repo/nest-pubsub';
import { SharedModule } from '@repo/nest-shared';
import { UserModule } from '@repo/nest-user';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PubSubModule,
    SharedModule,
    PrismaModule,
    LanguageModule,
    ClerkModule,
    ClerkBillingModule,
    CreditsModule,
    UserModule,
    OrganizationModule,
    OrganizationMembershipModule,
  ],
})
export class AppModule {}
