/**
 * The API omits zero-view days, so a small article's first record can fall a few days into a month it fully covered.
 * A first record by this day counts the month as full; a later one means the article was created (or renamed) mid-month.
 */
export const LATEST_FULL_MONTH_START_DAY = 8;
