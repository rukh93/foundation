export function isUnlimitedDate(d: unknown): boolean {
  if (!(d instanceof Date)) return true;

  return d.getTime() <= 0;
}
