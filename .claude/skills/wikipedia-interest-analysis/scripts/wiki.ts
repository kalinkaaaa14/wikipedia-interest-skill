// Entry point: node SKILL_DIR/scripts/wiki.ts <command> …  (Node ≥ 22.18 runs TypeScript natively)
// Checks dependencies before loading the CLI, whose imports (vega, pdfmake) would fail with a less useful error.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(skillDir, 'node_modules', 'vega-lite'))) {
  console.log(JSON.stringify({ error: 'Dependencies are not installed.', fix: `Run: npm ci --prefix "${skillDir}"` }));
  process.exit(2);
}

const { main } = await import('./cli/main.ts');
await main(process.argv.slice(2));
