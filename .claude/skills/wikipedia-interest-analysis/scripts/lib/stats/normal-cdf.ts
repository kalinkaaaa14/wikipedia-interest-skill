/** Standard normal CDF (Abramowitz–Stegun 7.1.26 approximation of erf, error < 1.5e-7). */
export function normalCdf(zScore: number): number {
  const base = 1 / (1 + 0.3275911 * Math.abs(zScore) / Math.SQRT2);
  const erf = 1 - (((((1.061405429 * base - 1.453152027) * base) + 1.421413741) * base - 0.284496736) * base + 0.254829592) * base * Math.exp(-(zScore * zScore) / 2);

  return zScore >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}
