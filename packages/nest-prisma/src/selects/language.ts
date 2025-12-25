import { Prisma } from '@repo/prisma';

export const languageDataSelect: Prisma.LanguageSelect = {
  id: true,
  value: true,
};
