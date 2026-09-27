import { realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runAnalysis } from '../lib/analyze/run-analysis.ts';
import { renderChart } from '../lib/chart/render-chart.ts';
import type { ChartMode } from '../types/chart-mode.ts';
import type { CliValues } from '../types/cli-values.ts';
import { buildCompactSummary } from './build-compact-summary.ts';
import { buildSpec } from './build-spec.ts';
import { isInsideSkill } from './is-inside-skill.ts';
import { printJson } from './print-json.ts';

function slug(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'run';
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

export async function runAnalyzeCommand(values: CliValues): Promise<void> {
  if (!values.out && isInsideSkill(realpathSync(process.cwd()))) {
    printJson({
      error: 'The current directory is inside the skill folder, so results would be written into the skill.',
      fix: "cd to the user's project directory and re-run the same command (or pass --out <path>).",
    });
    process.exitCode = 1;

    return;
  }

  const spec = await buildSpec(values);
  const result = await runAnalysis(spec);
  const topics = [...new Set(spec.series.map((series) => series.topic))].join(' ');
  const langs = [...new Set(spec.series.map((series) => series.lang))].join('-');
  const dir = resolve((values.out as string) ?? join('wiki-interest', `${slug(topics)}-${langs}-${timestamp()}`));
  await mkdir(dir, { recursive: true });
  const svg = await renderChart(result, (values.chart as ChartMode) ?? 'share');
  const summary = buildCompactSummary(result, dir);
  await Promise.all([
    writeFile(join(dir, 'spec.json'), JSON.stringify(spec, null, 2)),
    writeFile(join(dir, 'data.json'), JSON.stringify(result)),
    writeFile(join(dir, 'summary.json'), JSON.stringify(summary, null, 2)),
    writeFile(join(dir, 'chart.svg'), svg),
  ]);
  printJson(summary);
}
