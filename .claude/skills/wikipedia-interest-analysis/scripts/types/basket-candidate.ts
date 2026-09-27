import type { Candidate } from './candidate.ts';
import type { CandidateSummary } from './candidate-summary.ts';

export type BasketCandidate = Candidate & {
  /** What the agent searched for. */
  name: string;
  inAllLangs: boolean;
  /** Other plausible meanings when the name is ambiguous (Mercury: planet vs element). */
  alternatives?: CandidateSummary[];
};
