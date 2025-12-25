import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { FastifyRequestWithUser, FastifyUser } from '../clerk.types';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): FastifyUser => {
	const req = ctx.switchToHttp().getRequest<FastifyRequestWithUser>();
	return req.user;
});
