import { Injectable } from '@nestjs/common';
import { PrismaService, WebhookEventData, webhookEventDataSelect } from '@repo/nest-prisma';
import { $Enums, type $Enums as $EnumsType, Prisma } from '@repo/prisma';

@Injectable()
export class WebhookEventService {
  constructor(private readonly prismaService: PrismaService) {}

  async findUniqueById(
    id: string,
    provider: $EnumsType.WebhookProvider = $Enums.WebhookProvider.Clerk,
  ): Promise<WebhookEventData | null> {
    return this.prismaService.webhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId: id,
        },
      },
      select: webhookEventDataSelect,
    });
  }

  async markProcessing(id: string): Promise<Prisma.BatchPayload> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000);

    return this.prismaService.webhookEvent.updateMany({
      where: {
        id,
        OR: [
          {
            status: {
              in: [$Enums.WebhookProcessStatus.Received, $Enums.WebhookProcessStatus.Failed],
            },
          },
          {
            status: $Enums.WebhookProcessStatus.Processing,
            updatedAt: {
              lt: fifteenMinutesAgo,
            },
          },
        ],
      },
      data: {
        status: $Enums.WebhookProcessStatus.Processing,
      },
    });
  }

  async markFailed(id: string, message: string) {
    await this.prismaService.webhookEvent.update({
      where: {
        id,
      },
      data: {
        status: $Enums.WebhookProcessStatus.Failed,
        errorMessage: message,
      },
    });
  }
}
