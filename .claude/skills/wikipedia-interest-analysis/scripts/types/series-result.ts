import type { BasketBreakdown } from './basket-breakdown.ts';
import type { ConfidenceLevel } from './confidence-level.ts';
import type { Direction } from './direction.ts';
import type { MonthPoint } from './month-point.ts';
import type { SeriesMetrics } from './series-metrics.ts';
import type { SeriesStatus } from './series-status.ts';

export type SeriesResult = {
  label: string;
  lang: string;
  title: string | null;
  topic: string;
  qid?: string;
  status: SeriesStatus;
  monthly: MonthPoint[];
  metrics?: SeriesMetrics;
  direction?: Direction;
  confidence?: ConfidenceLevel;
  /** Why confidence is not "high". */
  reasons: string[];
  /** Informative context that does not lower confidence. */
  notes: string[];
  /** Observed evidence for hypotheses about causes; never causes themselves. */
  signals: string[];
  basket?: BasketBreakdown;
};
