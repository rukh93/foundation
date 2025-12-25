import { Prisma } from '@repo/prisma';

import { userDataSelect, userIdSelect } from '../selects';

export type UserId = Prisma.UserGetPayload<{
  select: typeof userIdSelect;
}>;

export type UserData = Prisma.UserGetPayload<{
  select: typeof userDataSelect;
}>;
