import { isUnlimitedDate } from './is-unlimited-date';

export function isEntitledNow(nowUtc: Date, periodEnd: unknown): boolean {
  if (isUnlimitedDate(periodEnd)) return true;

  return nowUtc.getTime() < (periodEnd as Date).getTime();
}
