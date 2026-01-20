import { Prisma } from '../../src';
import { languageDataSelect } from '../selects';

export type LanguageData = Prisma.LanguageGetPayload<{
  select: typeof languageDataSelect;
}>;
