import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { renderPdf } from '../lib/report/render-pdf.ts';
import { unverifiedPercents } from '../lib/report/unverified-percents.ts';
import type { AnalysisResult } from '../types/analysis-result.ts';
import type { CliValues } from '../types/cli-values.ts';
import { printJson } from './print-json.ts';
import { UsageError } from './usage-error.ts';

export async function runReportCommand(values: CliValues): Promise<void> {
  if (!values.run) {
    throw new UsageError('--run <run-dir> is required (the run_dir printed by analyze)');
  }

  for (const option of ['title', 'question', 'takeaway']) {
    if (!values[option]) {
      throw new UsageError(`--${option} is required`);
    }
  }

  const dir = resolve(values.run as string);
  const result: AnalysisResult = JSON.parse(await readFile(join(dir, 'data.json'), 'utf8'));
  const takeaway = values.takeaway as string;
  // Validation gate: every % in the agent's text must exist in the computed metrics.
  const unverified = unverifiedPercents(takeaway, result);

  if (unverified.length && !values.force) {
    printJson({
      error: `Takeaway contains percentages not found in the analysis: ${unverified.join(', ')}`,
      fix: 'Use only numbers from summary.json (round to whole %), or remove them. Re-run report.',
    });
    process.exitCode = 1;

    return;
  }

  if (takeaway.length > 700) {
    throw new UsageError('--takeaway is too long for a one-page report (max ~700 characters, 2–4 sentences).');
  }

  const svg = await readFile(join(dir, 'chart.svg'), 'utf8');
  const pdf = join(dir, 'report.pdf');
  const pages = await renderPdf(result, svg, { title: values.title as string, question: values.question as string, takeaway }, pdf);
  printJson({ pdf, pages, ...(pages > 1 ? { warning: 'Report overflowed one page: shorten --takeaway or analyze fewer series.' } : {}) });
}
