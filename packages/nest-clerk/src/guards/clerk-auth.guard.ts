import { getAuth } from '@clerk/fastify';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ErrorCodes } from '../clerk.constants';
import { ClerkService } from '../clerk.service';
import type { FastifyRequestWithUser } from '../clerk.types';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly clerkService: ClerkService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequestWithUser>();

    const { isAuthenticated, userId: clerkUserId, orgId: clerkOrgId } = getAuth(req);

    if (!isAuthenticated || !clerkUserId) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    if (!clerkOrgId) {
      throw new ForbiddenException(ErrorCodes.USER_NOT_IN_ORGANIZATION_CONTEXT);
    }

    const { userId, orgId, orgMemId } = await this.clerkService.ensureUserOrgSync(clerkUserId, clerkOrgId);

    req.user = { clerkOrgId, clerkUserId, userId, orgId, orgMemId };

    return true;
  }
}
