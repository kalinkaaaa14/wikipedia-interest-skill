import type { ConfidenceLevel } from '../../types/confidence-level.ts';

/** How much the ranking score is discounted for each confidence level. */
export const CONFIDENCE_FACTOR: Record<ConfidenceLevel, number> = { high: 1, medium: 0.75, low: 0.5 };
