/** Last day of a month in the Pageviews API format: '2024-02' → '20240229'. */
export function apiLastDay(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return `${month.replace('-', '')}${String(lastDayOfMonth).padStart(2, '0')}`;
}
