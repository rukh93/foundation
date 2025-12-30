import { HttpStatus, Injectable } from '@nestjs/common';

import type { IRequestResponse, IRequestService } from '../shared.interfaces';
import type { MessageActionType, MessageEntityType } from '../shared.types';

@Injectable()
export class HttpService implements IRequestService {
  createResponse<T = unknown>(
    statusCode: HttpStatus,
    action: MessageActionType,
    entity: MessageEntityType,
    data?: T,
  ): IRequestResponse<T> {
    return {
      statusCode,
      message: `SUCCESS_${entity}_${action}`,
      data,
    };
  }
}
