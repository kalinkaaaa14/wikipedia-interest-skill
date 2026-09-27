---
name: wikipedia-interest-analysis
description: Measures how interest in a topic changes across Wikipedia language editions using Wikimedia pageview data, with trend, confidence checks, charts and a one-page PDF report. Use when a user asks whether interest in a topic is growing, wants to compare topics or languages/markets (e.g. which language to localize into, which course or theme to add next), or wants a shareable report on Wikipedia pageviews or trends.
compatibility: Requires Node.js 22.18+, npm and internet access (wikimedia.org, wikidata.org, *.wikipedia.org).
---

# Wikipedia interest analysis

The code does all data work and computes every number. Your job: turn the question into topics + languages, confirm the articles, run the commands, and explain the output honestly.

`SKILL_DIR` below = the directory containing this file. All commands print JSON.

**Language:** write everything the user sees in the language of their question, including clarifying questions; translate the headings and the English sentences from the output. Never switch to another language or mix in its words (no Russian words in a Ukrainian or Polish answer).
Run every command from the user's project directory, never `cd` into `SKILL_DIR`: `analyze` creates its run folder in the current directory.

## Workflow

- [ ] 1. Parse the question: topic(s), language editions (ISO codes: pl, cs, uk…) and period (default 24 months). Decide per topic: a narrow concept (one article) or a broad field (a basket, see "Broad topics"). If several languages or topics are compared, note whether the user cares more about audience size or growth: that sets `--weights`.
  "Last year", "this year", "recently" → keep the default 24 months: the main metric already compares the last 12 months with the 12 before, and `--months 12` removes that comparison.
  No languages named → use the edition in the language of the question (a Ukrainian question → `--langs uk`), don't ask. Say which edition you analyzed and offer to add others.
- [ ] 2. Resolve the topic → Wikidata item → article titles per language
- [ ] 3. Show the user the chosen item and articles. Ask before analyzing if two or more candidates plausibly fit the user's words (see "Choosing the candidate" below). A missing article is not a reason to stop (see "Missing articles")
- [ ] 4. Analyze all chosen topics and languages in one run (ranking and comparisons only work within a run)
- [ ] 5. Answer using the template below
- [ ] 6. If the user wants something shareable: build the PDF report

### 2. Resolve

```bash
node SKILL_DIR/scripts/wiki.ts resolve --topic "intermittent fasting" --langs pl,cs
```

- Search in English (default) or in the language of the user's wording: `--search-lang uk --topic "астрономія"`. `--search-lang` must match the language of the `--topic` word (not `--search-lang uk --topic "Mercury"`).

**Choosing the candidate.** Read each candidate's `description`. Skip clearly unrelated ones (books, films, scientific papers, brands, places, sports teams, journals) unless the question points to them. Count the rest:
- Exactly one fits → use it and name it with its QID in the answer.
- Two or more fit → stop before `analyze`. List them with QIDs and ask which one the user means. Do not pick one yourself, even the most popular. Two is enough: "Java" (island Q3757 vs programming language Q251) is ambiguous just as much as "Mercury" (planet Q308, element Q925, god Q1150).
- If the fitting candidates are related topics rather than different meanings (intermittent fasting vs fasting, chess vs chess player), don't ask the user to pick one: offer to analyze them side by side with `--qids Q1,Q2`. Never add their views together.
- `ambiguous: true` in the `resolve` output means the word names several major topics. Treat the topic as ambiguous, unless the user's own words already pick one meaning ("планета Меркурій", "Java programming"): then use that one and say which QID you chose. `comparable` lists the biggest ones, but other candidates (the god Mercury) can be plausible too.

**Missing articles** (`articles.<lang> = null`, e.g. intermittent fasting has none in plwiki). Don't stop to ask; continue with the other languages:
1. Try `search --lang <lang> --query "<topic in that language>"`.
2. A result about exactly the same topic under another title → analyze all languages with `--articles "pl=<found title>|cs=<title from resolve>"` and tell the user that this article is not linked in Wikidata.
3. Only broader or related results (fasting instead of intermittent fasting) → never put them in the main analysis. Keep the language in `--langs`: it shows up as "no article" in the output. Report the content gap as a finding, and offer the related article as a separate follow-up, clearly called a proxy.
4. Ask the user only if no requested language has an article: then the choice of proxy changes the question.

**Broad topics** → measure a basket of subtopics, not one article. The main article is a small and untypical part of the interest in a field (astronomy: 3–4% of the basket's views).
- Broad = people interested in it read many different articles: an academic field or school subject (astronomy, biology, programming), a hobby or skill area (cooking, photography), or "learning X" (learning English: ESL, grammar, IELTS, TOEFL…).
- Narrow = one thing with one main article: a concept, object, person, product, one game, one diet (intermittent fasting, the planet Mercury, chess).
- `resolve` marks academic fields with `broad_field`. Hobbies, skills and "learning X" you judge yourself. If still unsure, ask the user: one article or a basket of subtopics?

1. Propose 10–20 English subtopics that people read about when interested in the field: concepts, objects, events. No biographies unless the field is about people. Always include the main topic itself.
2. `node SKILL_DIR/scripts/wiki.ts resolve --topics "astronomy|black hole|solar system|…" --langs uk,pl`
3. Check each match by its `description`. For names in `ambiguous`, pick the QID that fits the field.
4. Show the user the subtopics and `excluded` (missing in some language: a content gap). Ask them to confirm, remove or add. Do not analyze before they confirm.
5. Run the `analyze --basket` command from `hint`, with the topic name filled in.

### 4. Analyze

```bash
node SKILL_DIR/scripts/wiki.ts analyze --qids Q1666254 --langs pl,cs,uk
```

Options: `--months 36`, `--end 2025-12`, `--qids Q1,Q2` (compare topics), `--weights growth=0.3,size=0.7` (ranking only: growth = share YoY, size = views/month; default growth=0.6,size=0.4; always pass both), `--chart index` (growth shape when sizes differ a lot), `--articles "pl=Title|cs=Title"` (manual titles, no Wikidata), `--basket "astronomy=Q333,Q589,…;chemistry=…"` (broad topics; cannot be mixed with `--qids`).

The output has `run_dir`, `findings` (ready-made sentences), per-series metrics, `reasons` (why confidence is not high), `notes`, `signals` (evidence for hypotheses about causes), and `ranking`. The chart is saved to `run_dir/chart.svg`. Monthly values (views, edition share) are in `run_dir/data.json` → `series[].monthly`: use them when the user asks about month-by-month dynamics.

### 6. Report

```bash
node SKILL_DIR/scripts/wiki.ts report --run <run_dir> --title "..." --question "<user's question>" --takeaway "<2–4 sentences: answer + recommendation>"
```

Write the takeaway in the user's language. Every percentage in it is checked against the analysis. If `report` returns an `error`, fix the text using the numbers from the analysis output and run it again. Never use `--force` just to get past the check. Give the user the `pdf` path.

## Answer template

```
**Short answer:** <direction + confidence for each series; group series that share both: "pl, fr: declining (high confidence); de: no significant change; uk: no reliable direction">

| Edition: article | Direction | Views/month | Share YoY (robust) | Trend/yr | Confidence |
|---|---|---|---|---|---|
<one row per series, copied from the output>

**Why confidence is not high:** <for each series below high: its label and the reasons that matter. If all are high, say so in one line>
**What it means for you:** <recommendation tied to the user's goal; what to validate next>
**Limits:** pageviews = curiosity, not willingness to pay; language edition ≠ country.
```

Always include every section, including **Limits**.
Say "in all editions", "in both" or give one overall direction only when every series has the same `direction`. When they differ, the difference is the answer: name it.

## Interpretation rules

- Copy numbers from the JSON output. Never compute, extrapolate or round them differently yourself.
- Lead with `share_yoy_pct_robust`: the article's share of all views in its edition, same months year over year, spikes removed. The overall decline of Wikipedia traffic is already removed from the share: a falling share means the article lost more than its edition as a whole. Never explain a change in share by the overall traffic decline. That explanation fits only raw `views_yoy_pct`.
- Say "growing" or "declining" only if `direction` says so. `unclear` means there is no reliable direction: say so and give the reason from `findings`, even if the percentage is large. With `confidence: low`, say the data cannot support a conclusion.
- Words for `direction`: `growing` → growing, `declining` → declining, `flat` → "no significant change", `unclear` → "no reliable direction". Translate them, but don't call `flat` "stable interest" or `unclear` "slightly declining". `flat` is never growth or decline, whatever the sign of the percentage: +1.5% with `flat` is "no significant change", not "the only growing market".
- A basket series (`… (basket of N)`) is interest in the whole field. Name how many subtopics it has, report which ones grow or decline (the `subtopics` line in `findings`) and list `basket.excluded` as content gaps. A basket that is flat overall can hide one growing subtopic: that subtopic is often the most useful finding.
- Name editions by language, not country: "Spanish-language Wikipedia", not "Spain"; a language edition is read in many countries.
- Absolute size matters for markets: +50% on 150 views/month is noise; −5% on 20,000 is a big, stable audience.
- The data shows what changed, not why. Never state a cause of a peak, spike, trend or difference between languages as a fact (school terms, news, audience type, "the German edition is more conservative"). Name a cause only if it would change the user's decision, and then as a hypothesis to check: "one possible reason is …; to check, …". Never invent traits of a language edition or its readers. `signals` in the output are observed evidence (weekday pattern, whether a spike or peak is shared across editions): use them to support or rule out a hypothesis, but they are still not proof of a cause.
- Do not judge a level as "normal", "large" or "small for this kind of topic" unless another topic or language in the same run gives the comparison.
- `ranking` is a transparent heuristic (percentile growth × size × confidence), not a verdict. If the user states their own criteria, re-run with `--weights` and explain the score with the formula in the `Highest score` line of `findings`.

## Follow-up requests

The data is cached, so re-running is cheap. Run `analyze` again with changed flags instead of reasoning from the old output:

- "add Slovak" → same `--qids`, add `sk` to `--langs`
- "last 3 years" → `--months 36`
- "compare with yoga" → resolve yoga, then `--qids Q_old,Q_new`
- "use a different article" → `--articles`, or edit `run_dir/spec.json` and run `analyze --spec <path>`
- "add black holes to astronomy" → same `--basket`, add the QID (resolve it with `resolve --topics` first)

## Gotchas

- Wikidata search returns papers and clinical trials with the same name. `resolve` hides items with no Wikipedia articles, but still check the `description`.
- `resolve` matches item names, not descriptions: `--topic "Mercury planet"` finds only the BepiColombo probe. Search by the name ("Mercury") and pick the meaning from the candidates' `description`.
- "Interest in learning X" rarely has its own article in every language ("English as a second or foreign language", Q130192, is missing in pl and uk). Treat it as a broad topic: a basket of subtopics about learning it (the language itself, ESL, the main exams, grammar…). Articles missing in some language show up in `excluded`.
- Many topics peak in the same month every year (astronomy in September with a summer drop, diets in January). Never compare a peak month with a trough month. The code compares the same months and puts `Strong yearly seasonality` in `notes`. Report the peak month, not a guess about who causes it.
- `Abrupt level shift` in `reasons` means traffic jumped or fell several-fold within a few months. Possible causes include a rename, a redirect change, a search-engine change or a real change in interest; the data cannot tell them apart. Tell the user, but never state the cause as a fact: you have not checked it. When the shift is within the last 24 months, the code already sets `direction` to `unclear`. Suggest checking the article history.
- Evergreen reference articles (water, astronomy, chess) lost more than the average article in 2024–2026, likely because search engines and AI assistants now answer "what is X" questions directly. The share does not remove this effect, so a falling share of such a topic may partly reflect it rather than less interest. Mention it as a possible factor, not as the cause ("part of this decline may be because…", never "this reflects…"). A decline means more when compared with other topics or languages analyzed in the same run.
- English Wikipedia is read worldwide, so `en` is not a proxy for the US or UK market.

For how the metrics and confidence are computed (for example, when the user asks "how reliable is this?"), read [references/METHODOLOGY.md](references/METHODOLOGY.md).
