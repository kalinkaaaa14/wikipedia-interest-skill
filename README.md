# wikipedia-interest-analysis

An Agent Skill that answers B2C founders' product questions — "which topic should we add next?", "which language should we launch in?" — from Wikipedia pageview data. It measures how interest in a topic changes across language editions, says how far the result can be trusted, draws a chart and builds a one-page PDF report.

The skill lives in `.claude/skills/wikipedia-interest-analysis/`, where Claude Code finds it automatically.

## Quick start

```bash
cd .claude/skills/wikipedia-interest-analysis
npm ci --omit=dev   # to use the skill (Node.js ≥ 22.18)
npm ci              # to develop: lint, typecheck, tests (Node 24 LTS, see .nvmrc)
```

Then ask the agent, for example: *"Is interest in astronomy growing in Ukrainian Wikipedia, and how far can we trust it?"*

The agent runs these commands from the project root (all output is JSON):

```bash
SKILL=.claude/skills/wikipedia-interest-analysis
node $SKILL/scripts/wiki.ts resolve --topic "intermittent fasting" --langs pl,cs
node $SKILL/scripts/wiki.ts analyze --qids Q1666254 --langs pl,cs
node $SKILL/scripts/wiki.ts resolve --topics "astronomy|black hole|galaxy" --langs uk,pl
node $SKILL/scripts/wiki.ts analyze --basket "astronomy=Q333,Q589,Q318" --langs uk,pl
node $SKILL/scripts/wiki.ts report --run wiki-interest/<run> --title "…" --question "…" --takeaway "…"
```

Each `analyze` writes `wiki-interest/<topic>-<langs>-<time>/` with `spec.json`, `data.json`, `summary.json` and `chart.svg`; `report` adds `report.pdf`.

To use the skill in another project, copy the folder into that project's `.claude/skills/` (or `~/.claude/skills/` for all projects) and run `npm ci --omit=dev` in it.

## How it works

1. **Parse the question** (model): topic, languages (default: the language of the question), period (default: 24 months). Decide whether the topic is one thing (one article) or a whole field (a basket of articles).
2. **Resolve** the topic through Wikidata, so every language uses the article about the same concept. An ambiguous word ("Mercury") makes the agent ask; a missing article is reported as a content gap.
3. **Broad fields** (astronomy, programming, "learning English") are measured as a basket of 10–20 subtopics that the user confirms. `resolve` flags academic fields itself from their Wikidata class.
4. **Analyze** (code), per language:
   - share of the edition's total views, so the overall decline of Wikipedia traffic is removed;
   - spike days (news, events) replaced by the local median;
   - last 12 months vs the previous 12, same calendar months, so seasonality cancels out;
   - trend over the whole period (Theil–Sen slope) and its significance (Mann–Kendall);
   - abrupt level shifts and yearly seasonality;
   - → **direction** (growing / declining / flat / unclear) and **confidence** (high / medium / low) with the reasons that lower it.
5. **Answer** (model) from ready-made findings, with limits; **report** builds the PDF and rejects any percentage that the analysis did not produce.

Formulas and thresholds: [`references/METHODOLOGY.md`](.claude/skills/wikipedia-interest-analysis/references/METHODOLOGY.md).

## Key decisions

| Decision | Why |
|---|---|
| Code computes every number; the model only explains | A cheap model cannot invent figures. `findings` are ready-made sentences. |
| Share of edition traffic, not raw views | Wikipedia traffic keeps falling (Ukrainian: 94M → 51M views/month in 3 years); without normalization almost everything looks like decline. |
| "Growing" or "declining" needs two confirmations | A ≥10% year-over-year change **and** a significant trend in the same direction; otherwise "flat" or "unclear". |
| Confidence as explicit caps | The user sees why a result is not trusted (small audience, spikes, short history, level shift). |
| Baskets for broad fields | The main article of a field is a small, untypical part of the interest in it: "Astronomy" is 3–4% of an 11-subtopic basket. |
| Hints inside the JSON output | A weak model follows the command output more reliably than the instructions: "wait for confirmation" worked in 1/6 runs as a SKILL.md rule and in 6/6 as a hint in the output. |
| Percentage check in the report | The PDF cannot contain a number the analysis did not produce (±1 pp). |
| TypeScript run natively by Node, cached API responses | No build step, reproducible `npm ci`; follow-up questions re-run in a fraction of a second. |

## Project layout

```
.claude/skills/wikipedia-interest-analysis/
  SKILL.md                    instructions for the agent
  references/METHODOLOGY.md   formulas and thresholds
  scripts/wiki.ts             entry point (checks dependencies)
  scripts/cli/                one file per command: resolve, search, analyze, report
  scripts/lib/                analyze, stats, wikidata, pageviews, http, chart, report, dates
  scripts/types/              shared types, one per file
  tests/                      unit tests (node:test)
  evals/                      scenarios, runner and transcripts for a weak model
CLAUDE.md                     code style rules, enforced by ESLint
```

## How the result was verified

- **Unit tests** (31) on synthetic series with known answers and on real values: spikes, level shifts, seasonality, direction edge cases, ranking, baskets, the percentage check.
- **Against the source:** monthly sums computed from daily data match the Pageviews API monthly endpoint exactly.
- **End to end on real data:** all three example questions from the task, PDFs checked visually (one page, Cyrillic and diacritics).
- **Refactoring safety:** outputs before and after the code rewrite are byte-identical (21 checks).
- **Strict typecheck and ESLint.**
- **Evals on a weak model:** 12 scenarios × 3 repeats (`node evals/run.ts --model haiku --repeat 3`), each run in an empty temporary project with only the skill installed and no developer memory. Transcripts are graded against the expectations in `evals/evals.json` by automatic checks plus reading every answer.

| Scenario | Result (Claude Haiku 4.5) |
|---|---|
| Ambiguous word ("Mercury") | asks which meaning, with QIDs: 3/3 |
| Meaning given ("planet Mercury") | analyzes Q308 without asking: 3/3 |
| Missing article (intermittent fasting, pl/cs) | pl reported as a content gap, cs analyzed: 3/3 |
| Astronomy (uk; uk + pl) | basket → one confirmation → analysis: 6/6 |
| Learning English, 5 languages + report | basket of learning subtopics → analysis: 3/3; PDF: 2/3 |
| Follow-up ("add languages, 3 years") | re-runs with the new settings: 3/3 |
| "Last year", no languages named, Polish question | correct period, language and answer language: 9/9 |

Remaining model errors (in roughly 15–20% of runs): guessing causes, naming a country instead of a language edition, occasional words from another language.

## Limitations

- Pageviews show curiosity, not willingness to pay: use them to choose what to validate next.
- A language edition is not a country; English Wikipedia is read worldwide.
- The data shows what changed, not why; causes are offered only as hypotheses.
- Part of the decline of reference articles comes from search engines and AI assistants answering directly.
- Views of redirects are not counted; bots that slip into "user" traffic show up as spikes.
- Thresholds (spikes, 10%, p < 0.1, audience size) are reasoned judgment calls, not calibrated values.
- The PDF is in English except for the takeaway.

## Development

```bash
cd .claude/skills/wikipedia-interest-analysis
npm run lint && npm test && npm run typecheck
node evals/run.ts --model haiku --repeat 3 [scenario-id …]   # counts toward the Claude subscription limit
```
