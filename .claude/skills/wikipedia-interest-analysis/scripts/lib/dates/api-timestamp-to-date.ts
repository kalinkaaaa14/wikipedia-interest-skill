/** '2024010100' (API timestamp) → '2024-01-01'. */
export function apiTimestampToDate(timestamp: string): string {
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
}
