# Code rules

Apply to all TypeScript in this project (`.claude/skills/wikipedia-interest-analysis/`: `scripts/`, `tests/`, `evals/`).

## Language and runtime
- TypeScript only (`.ts`), no `.js`/`.mjs`. Node ≥ 22.18 runs `.ts` natively: no build step, no tsx.
- Only syntax Node can erase: no `enum`, `namespace` or parameter properties (`erasableSyntaxOnly` is on in tsconfig). Import types with `import type`.
- Relative imports include the `.ts` extension.

## Files
- File names are kebab-case: `analyze-series.ts`, `http-error.ts`. Tests: `<name>.test.ts`.
- One export per file; the file is named after the export in kebab-case (`analyzeSeries` → `analyze-series.ts`).
- A helper used by one file stays in it, unexported. A helper used in two or more places gets its own file.

## Types
- Use `type`, never `interface`; extend with `&`.
- Every type lives in its own file under `scripts/types/` (`evals/types/` for evals).
- No inline object types in signatures: name them and move them to `types/`.

## Names
- No single-letter names: variables, parameters and callback parameters (`(candidate) =>`, not `(c) =>`). The only exception is the index of a classic `for (let i = 0; …)` loop.
- A name says what it holds: `dailyViews`, not `values`.

## Formatting
- No single-line `if`: the body always goes in `{ }` on its own lines.
- A blank line before `return`, unless `return` is the first line of its block.
- A blank line before and after an `if` (including its `else`), unless it is the first or last line of its block.
- A simple ternary (`a ? b : c`) is fine; nested ternaries are not.

## Checks
- After changing code, run `npm run lint`, `npm test` and `npm run typecheck` in the skill folder. ESLint enforces the rules above.
