import type { OrganizationMembershipWebhookEvent } from '@clerk/fastify';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClerkRoleMapperService } from '@repo/nest-clerk-role-mapper';

import { OrganizationMembershipService } from './organization-membership.service';

@Injectable()
export class OrganizationMembershipConsumer {
  constructor(
    private readonly clerkRoleMapperService: ClerkRoleMapperService,
    private readonly organizationMembershipService: OrganizationMembershipService,
  ) {}

  @RabbitSubscribe({
    exchange: 'entity.events',
    routingKey: 'organizationMembership.*',
    queue: 'organizationMemberships.clerk.events',
    queueOptions: {
      channel: 'events',
      durable: true,
    },
  })
  async handleOrganizationEvents(event: OrganizationMembershipWebhookEvent) {
    if (event.type === 'organizationMembership.deleted') {
      return await this.processOrganizationMembershipDelete(event);
    }

    return await this.processOrganizationMembershipUpsert(event);
  }

  async processOrganizationMembershipUpsert({ type, data }: OrganizationMembershipWebhookEvent) {
    if (type !== 'organizationMembership.created' && type !== 'organizationMembership.updated') {
      return;
    }

    try {
      await this.organizationMembershipService.upsert({
        organizationMembership: {
          clerkOrgMemId: data.id,
          role: this.clerkRoleMapperService.mapRole(data.role),
        },
        organization: {
          clerkOrgId: data.organization.id,
          name: data.organization.name,
        },
        user: {
          clerkUserId: data.public_user_data.user_id,
          email: data.public_user_data.identifier,
          firstName: data.public_user_data.first_name,
          lastName: data.public_user_data.last_name,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }

  async processOrganizationMembershipDelete({ type, data }: OrganizationMembershipWebhookEvent) {
    if (type !== 'organizationMembership.deleted' || !data.id) {
      return;
    }

    try {
      await this.organizationMembershipService.delete(data.id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }
}
