import { Prisma } from '../../src';
import { languageDataSelect } from './language';

export const userIdSelect: Prisma.UserSelect = {
  id: true,
};

export const userDataSelect: Prisma.UserSelect = {
  ...userIdSelect,
  clerkUserId: true,
  email: true,
  language: {
    select: languageDataSelect,
  },
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
};
