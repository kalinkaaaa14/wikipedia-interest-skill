import { parseArgs } from 'node:util';
import type { ErrorWithCode } from '../types/error-with-code.ts';
import { printJson } from './print-json.ts';
import { runAnalyzeCommand } from './run-analyze-command.ts';
import { runReportCommand } from './run-report-command.ts';
import { runResolveCommand } from './run-resolve-command.ts';
import { runSearchCommand } from './run-search-command.ts';
import { UsageError } from './usage-error.ts';

const USAGE = `Usage (all output is JSON on stdout):
  wiki resolve --topic "intermittent fasting" --langs pl,cs [--search-lang en]
  wiki resolve --topics "astronomy|black hole|galaxy|…" --langs uk,pl     (broad topic: subtopics for a basket)
  wiki search  --lang pl --query "post przerywany"                      (fallback when resolve gives null for a language)
  wiki analyze --qids Q123[,Q456] --langs pl,cs [--months 24] [--end YYYY-MM] [--weights growth=0.6,size=0.4] [--chart share|index]
  wiki analyze --articles "pl=Post przerywany|cs=Přerušovaný půst"      (when there is no Wikidata item)
  wiki analyze --basket "astronomy=Q333,Q589,…[;chemistry=Q2329,…]" --langs uk,pl [...]
  wiki analyze --spec <run-dir>/spec.json [--months 36] [...]         (re-run an edited spec)
  wiki report  --run <run-dir> --title "..." --question "..." --takeaway "..." [--force]`;

export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  try {
    const { values } = parseArgs({
      args: rest,
      options: {
        topic: { type: 'string' }, topics: { type: 'string' }, basket: { type: 'string' }, langs: { type: 'string' }, 'search-lang': { type: 'string' },
        lang: { type: 'string' }, query: { type: 'string' },
        qids: { type: 'string' }, articles: { type: 'string' }, spec: { type: 'string' },
        months: { type: 'string' }, end: { type: 'string' }, weights: { type: 'string' },
        chart: { type: 'string' }, out: { type: 'string' },
        run: { type: 'string' }, title: { type: 'string' }, question: { type: 'string' },
        takeaway: { type: 'string' }, force: { type: 'boolean' },
      },
      strict: true,
    });

    if (command === 'resolve') {
      await runResolveCommand(values);
    } else if (command === 'search') {
      await runSearchCommand(values);
    } else if (command === 'analyze') {
      await runAnalyzeCommand(values);
    } else if (command === 'report') {
      await runReportCommand(values);
    } else {
      throw new UsageError(command ? `Unknown command "${command}"` : 'No command given');
    }
  } catch (caught) {
    const error = caught as ErrorWithCode;
    const showUsage = caught instanceof UsageError || error.code?.startsWith('ERR_PARSE_ARGS');
    printJson({ error: error.message, ...(showUsage ? { usage: USAGE } : {}) });
    process.exitCode = 1;
  }
}
