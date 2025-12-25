import { Prisma } from '@repo/prisma';

import { languageDataSelect } from '../selects';

export type LanguageData = Prisma.LanguageGetPayload<{
  select: typeof languageDataSelect;
}>;
