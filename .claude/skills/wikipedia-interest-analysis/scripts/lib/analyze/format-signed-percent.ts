/** '+12.5%' or '-3%'; `missing` stands in for a value that could not be computed. */
export function formatSignedPercent(value: number | null | undefined, missing = 'n/a'): string {
  if (value === null || value === undefined) {
    return missing;
  }

  return `${value > 0 ? '+' : ''}${value}%`;
}
