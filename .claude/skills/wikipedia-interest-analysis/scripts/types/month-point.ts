export type MonthPoint = {
  month: string;
  /** null = before the article had any data. */
  views: number | null;
  /** Views with spike days replaced by the local median. */
  viewsRobust: number | null;
  projectViews: number;
  /** Views per 1M human views of the whole edition. */
  perMillion: number | null;
};
