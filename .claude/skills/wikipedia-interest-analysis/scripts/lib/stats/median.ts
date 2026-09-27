export function median(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
