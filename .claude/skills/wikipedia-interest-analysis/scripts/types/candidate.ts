export type Candidate = {
  qid: string;
  label: string;
  description: string;
  /** lang → article title (null = no article in that language edition). */
  articles: Record<string, string | null>;
  /** How many Wikipedia language editions have an article: a rough "notability" signal. */
  wikipediaEditions: number;
};
