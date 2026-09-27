import type { ConfidenceLevel } from './confidence-level.ts';

export type RankRow = {
  label: string;
  score: number;
  growthPct: number | null;
  avgMonthlyViews: number;
  confidence: ConfidenceLevel;
};
