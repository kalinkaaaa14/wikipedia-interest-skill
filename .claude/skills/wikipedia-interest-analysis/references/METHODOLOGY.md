# Methodology

Read this when the user asks how numbers are computed or how far to trust them. Summarize it for them in plain words; do not paste it.

## Data

- **Source:** Wikimedia Pageviews REST API, `agent=user` (automated and spider traffic excluded), `access=all-access`, daily granularity. Data exists from July 2015.
- **Denominator:** daily human pageviews of the whole language edition (`/aggregate`), fetched for the same period.
- **Period:** complete calendar months only, ending with the last complete month. The current partial month is never used.
- **Topic → article:** Wikidata item sitelinks, so every language uses the article about the same concept. Views of redirect titles are not added.
- **New articles:** months before the first full month with data are excluded. A partial first month would look like growth.

## Metrics (per edition × article)

| Field | Meaning |
|---|---|
| `avg_monthly_views` | Mean monthly views over the last 12 months (absolute audience size). |
| `share_yoy_pct_raw` | Share of edition views, last 12 months vs the previous 12. Same calendar months, so seasonality cancels out. Only in `data.json` (as `yoySharePct`), not in the agent's summary. |
| `share_yoy_pct_robust` | The same, but spike days are replaced by the local median. **The main growth metric.** |
| `views_yoy_pct` | Raw view change, not normalized. Shown for context only. |
| `trend_pct_per_year` | Theil–Sen slope of log(monthly robust share), expressed as %/year. Median of pairwise slopes, robust to outliers. |
| `trend_p` | Mann–Kendall two-sided p-value on the same series. Is there a monotonic trend at all? Non-parametric. |
| `spike_share_pct` | % of views that were excess views on spike days. |

**Spikes:** a day is a spike if its views exceed max(local median + 5·MAD, 3 × local median, 10), where "local" is a ±28-day window. A local window keeps steady growth from being flagged as a spike.

**Level shift:** the largest ratio between the medians of the 6 months before and the 6 months after any month, when it is ≥2.5× or ≤0.4×. Shifts that repeat 12 months apart are treated as seasonality.

**Seasonality:** the last 12 months correlate with the previous 12 (r > 0.6) and the peak is ≥2× the trough.

## Signals

Observed evidence for or against a hypothesis about causes. They are never causes themselves.

- **Weekday/weekend ratio:** (article weekday views / weekend views) ÷ (the same for the whole edition), on spike-free daily values. 1 = the same weekly rhythm as the edition; ≥1.3 = read relatively more on weekdays; ≤0.77 = relatively more on weekends. Computed for the last 12 months, and separately for the peak calendar month when there is strong seasonality. Only for articles with ≥300 views/month and ≥8 weekend days. Days are UTC, so for editions read across many time zones (`en`) the weekday/weekend boundary is blurred.
- **Shared spike:** the biggest spike of a series is "shared" if another edition of the same topic in the run has a spike within ±2 days. Editions whose article did not exist yet on that day are not counted.
- **Peak months:** for a series with strong seasonality, the peak month of every other edition of the same topic in the run (or `none`).

Cross-edition signals appear only when the run has at least two languages for the same topic.

## Baskets (broad topics)

- **Members:** Wikidata items proposed by the agent and confirmed by the user. Only items with an article in every language of the run are used, so editions are compared on the same set; the rest are listed in `excluded`.
- **New articles:** a member whose first view is later than the 8th day of the period is excluded; its arrival would look like growth.
- **Series:** daily views of the members are summed, then analyzed exactly like one article (share, YoY, trend, spikes, level shift, confidence, signals).
- **Breakdown:** every member is also analyzed on its own; `share_of_basket_pct` = its views / basket views over the last 12 months.
- **Limits:** the sum is dominated by the biggest members, and the basket depends on which subtopics were chosen. The breakdown makes both visible.

## Direction

- `flat`: |robust share YoY| < 10%, except the borderline case below.
- `growing` / `declining`: |change| ≥ 10% **and** the trend has the same sign **and** Mann–Kendall p < 0.1.
- Borderline: |change| is 5–10%, but the trend has the same sign, is ≥ 10%/year and p < 0.1 → `growing` / `declining`, not `flat` (fr: Mercure (planète), −9.6% YoY with a −15.4%/yr trend, p = 0.003). Below 5% it stays `flat` even with a strong trend, because the two measures disagree (fr: Marie Curie, −0.6% YoY vs −15.9%/yr).
- `unclear`: a large change without a consistent trend (for example, one jump).
- `unclear` also when an abrupt level shift falls within the last 24 months: the year-over-year number is then driven by one step, not by a trend.

## Confidence

Starts at `high`. Each problem caps it; the list of caps is returned in `reasons`.

| Condition | Cap |
|---|---|
| < 300 views/month | low |
| YoY change flips sign once spikes are removed | low |
| > 50% of views from spikes | low |
| < 3,000 views/month | medium |
| > 20% of views from spikes | medium |
| < 24 months of data (no YoY) | medium |
| Mann–Kendall p ≥ 0.1 | medium |
| Direction `unclear` | medium |
| Abrupt level shift | medium |
| Article created during the period | medium |

The thresholds are judgment calls. They are simple on purpose, so the user can see why a result is not trusted.

## Ranking score

For series with status `ok`: `score = (w_g · pct_rank(growth) + w_s · pct_rank(size)) / (w_g + w_s) × m`, where m = 1 (high), 0.75 (medium) or 0.5 (low). Growth counts only for `growing`/`declining` series; `flat` and `unclear` count as 0, so a +1.5% "flat" or a one-off level shift earns no growth points. Defaults: w_g = 0.6, w_s = 0.4. Percentile ranks keep the scale of views from dominating. The score only compares series within one run.

## Known limitations

- Pageviews show curiosity and information need, not purchase intent.
- Language edition ≠ country. Bilingual readers often use English Wikipedia.
- Some bots are misclassified as users, which usually shows up as spikes.
- A decline can come from search engines or AI assistants answering directly, not only from lower interest.
- A rename moves views to the new title; the old title becomes a redirect whose views are not counted.
