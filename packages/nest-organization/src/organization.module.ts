import { Module } from '@nestjs/common';

import { OrganizationConsumer } from './organization.consumer';
import { OrganizationService } from './organization.service';

@Module({
	exports: [OrganizationService],
	providers: [OrganizationService, OrganizationConsumer],
})
export class OrganizationModule {}
