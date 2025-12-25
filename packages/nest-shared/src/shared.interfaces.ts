import { HttpStatus } from '@nestjs/common';

import type { SuccessCode } from './shared.types';

export interface IRequestResponse<T = unknown> {
	statusCode: HttpStatus;
	message: SuccessCode;
	data?: T;
}

export interface IRequestService<T = unknown> {
	createResponse(statusCode: HttpStatus, message: string, data?: T): IRequestResponse<T>;
}
