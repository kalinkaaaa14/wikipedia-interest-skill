export type EvalCase = {
  id: string;
  prompt: string;
  /** The user's second message in the same session. */
  reply?: string;
  /** Continue a copy of this case's session. */
  after?: string;
  expectations: string[];
};
