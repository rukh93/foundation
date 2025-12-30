import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/prisma';
import { MeiliSearchApiError } from 'meilisearch';
import { ErrorStatusCode } from 'meilisearch';

import { ErrorCodes } from '../shared.constants';
import type { ErrorCode, MessageActionType, MessageEntityType } from '../shared.types';

@Injectable()
export class ErrorManagerService {
  private readonly logger = new Logger(ErrorManagerService.name);

  logError(
    error: unknown,
    context: string,
    action: MessageActionType,
    entity: MessageEntityType,
    meta: Record<string, unknown> = {},
  ) {
    this.logger.error({ error, meta, action, entity }, error instanceof Error ? error.stack : undefined, context);
  }

  logErrorAndThrow(
    error: unknown,
    context: string,
    action: MessageActionType,
    entity: MessageEntityType,
    meta: Record<string, unknown> = {},
  ): never {
    this.logError(error, context, action, entity, meta);

    if (this.isPrismaError(error)) {
      const errorCode = this.buildErrorCode(entity, action, error.code);

      switch (error.code) {
        case 'P2002':
          throw new ConflictException(errorCode);

        case 'P2025':
          throw new NotFoundException(errorCode);

        default:
          throw new InternalServerErrorException(errorCode);
      }
    }

    if (this.isMeiliError(error)) {
      const errorCode = this.buildErrorCode(entity, action, error.cause?.code ?? ErrorCodes.UNKNOWN_ERROR);

      switch (error.cause?.code) {
        case ErrorStatusCode.DOCUMENT_NOT_FOUND:
        case ErrorStatusCode.INDEX_NOT_FOUND:
        case ErrorStatusCode.TASK_NOT_FOUND:
          throw new NotFoundException(errorCode);

        case ErrorStatusCode.INDEX_ALREADY_EXISTS:
        case ErrorStatusCode.INDEX_PRIMARY_KEY_ALREADY_EXISTS:
          throw new ConflictException(errorCode);

        case ErrorStatusCode.INVALID_INDEX_UID:
        case ErrorStatusCode.INVALID_SEARCH_Q:
        case ErrorStatusCode.INVALID_API_KEY:
        case ErrorStatusCode.MISSING_PAYLOAD:
          throw new BadRequestException(errorCode);

        default: {
          throw new HttpException(errorCode, error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(ErrorCodes.SOMETHING_WENT_WRONG);
  }

  extractErrorCode(error: unknown, action?: MessageActionType, entity?: MessageEntityType): string {
    if (!this.isPrismaError(error)) return ErrorCodes.UNKNOWN_ERROR;

    if (entity && action) {
      return this.buildErrorCode(entity, action, error.code);
    }

    return error.code;
  }

  private isMeiliError(error: unknown): error is MeiliSearchApiError {
    return error instanceof MeiliSearchApiError;
  }

  private isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
  }

  private buildErrorCode(entity: MessageEntityType, action: MessageActionType, prismaCode: string): ErrorCode {
    return `ERROR_${entity}_${action}_${prismaCode}`;
  }
}
