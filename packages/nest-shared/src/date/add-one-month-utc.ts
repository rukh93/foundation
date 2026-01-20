export function addOneMonthUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  const hh = d.getUTCHours();
  const mm = d.getUTCMinutes();
  const ss = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const targetYear = m === 11 ? y + 1 : y;
  const targetMonth = (m + 1) % 12;

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, hh, mm, ss, ms));
}
