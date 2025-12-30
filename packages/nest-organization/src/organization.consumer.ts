import type { OrganizationWebhookEvent } from '@clerk/fastify';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { OrganizationService } from './organization.service';

@Injectable()
export class OrganizationConsumer {
  constructor(private readonly organizationService: OrganizationService) {}

  @RabbitSubscribe({
    exchange: 'entity.events',
    routingKey: 'organization.*',
    queue: 'organizations.clerk.events',
    queueOptions: {
      channel: 'events',
      durable: true,
    },
  })
  async handleOrganizationEvents(event: OrganizationWebhookEvent) {
    if (event.type === 'organization.deleted') {
      return await this.processOrganizationDelete(event);
    }

    return await this.processOrganizationUpsert(event);
  }

  async processOrganizationUpsert({ type, data }: OrganizationWebhookEvent) {
    if (type !== 'organization.created' && type !== 'organization.updated') {
      return;
    }

    try {
      await this.organizationService.upsert({
        name: data.name,
        clerkOrgId: data.id,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }

  async processOrganizationDelete({ type, data }: OrganizationWebhookEvent) {
    if (type !== 'organization.deleted' || !data.id) {
      return;
    }

    try {
      await this.organizationService.delete(data.id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }
}
