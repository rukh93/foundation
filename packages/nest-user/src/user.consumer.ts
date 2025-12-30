import type { UserWebhookEvent } from '@clerk/fastify';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus, type UserStatus as UserStatusType } from '@repo/prisma';

import { UserService } from './user.service';
import type { UpsertUserInput } from './user.types';

@Injectable()
export class UserConsumer {
  constructor(private readonly userService: UserService) {}

  @RabbitSubscribe({
    exchange: 'entity.events',
    routingKey: 'user.*',
    queue: 'users.clerk.events',
    queueOptions: {
      channel: 'events',
      durable: true,
    },
  })
  async handleUserEvents(event: UserWebhookEvent) {
    if (event.type === 'user.deleted') {
      return await this.processUserDelete(event);
    }

    return await this.processUserUpsert(event);
  }

  async processUserUpsert({ type, data }: UserWebhookEvent) {
    if (type !== 'user.created' && type !== 'user.updated') {
      return;
    }

    const primaryEmail =
      data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      throw new Error(`Clerk user ${data.id} has no email`);
    }

    const primaryPhone =
      data.phone_numbers.find((p) => p.id === data.primary_phone_number_id)?.phone_number ??
      data.phone_numbers[0]?.phone_number ??
      null;

    let status: UserStatusType = UserStatus.Active;

    if (data.banned) {
      status = UserStatus.Banned;
    } else if (data.locked) {
      status = UserStatus.Locked;
    }

    const userData: UpsertUserInput = {
      clerkUserId: data.id,
      email: primaryEmail,
      status,
      ...(data.first_name ? { firstName: data.first_name } : {}),
      ...(data.last_name ? { lastName: data.last_name } : {}),
      ...(primaryPhone ? { phone: primaryPhone } : {}),
    };

    try {
      await this.userService.upsert(userData);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }

  async processUserDelete({ type, data }: UserWebhookEvent) {
    if (type !== 'user.deleted' || !data.id) {
      return;
    }

    try {
      await this.userService.delete(data.id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        return;
      }

      throw error;
    }
  }
}
