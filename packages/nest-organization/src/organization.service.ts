import { Injectable } from '@nestjs/common';
import { type OrganizationId, organizationIdSelect, PrismaService } from '@repo/nest-prisma';
import { ErrorManagerService, MessageAction, MessageEntity } from '@repo/nest-shared';

import type { UpsertOrganizationInput } from './organization.types';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly errorManagerService: ErrorManagerService,
    private readonly prismaService: PrismaService,
  ) {}

  async upsert(data: UpsertOrganizationInput): Promise<OrganizationId> {
    try {
      const { clerkOrgId, ...rest } = data;

      return await this.prismaService.organization.upsert({
        where: {
          clerkOrgId,
        },
        create: data,
        update: rest,
        select: organizationIdSelect,
      });
    } catch (error) {
      this.errorManagerService.logErrorAndThrow(
        error,
        OrganizationService.name,
        MessageAction.UPSERT,
        MessageEntity.ORGANIZATION,
        { clerkOrgId: data.clerkOrgId },
      );
    }
  }

  async delete(id: string): Promise<OrganizationId> {
    try {
      return await this.prismaService.organization.delete({
        where: {
          clerkOrgId: id,
        },
        select: organizationIdSelect,
      });
    } catch (error) {
      this.errorManagerService.logErrorAndThrow(
        error,
        OrganizationService.name,
        MessageAction.DELETE,
        MessageEntity.ORGANIZATION,
        { clerkOrgId: id },
      );
    }
  }
}
