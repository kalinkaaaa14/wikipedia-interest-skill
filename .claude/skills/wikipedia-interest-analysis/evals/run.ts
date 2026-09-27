// Runs eval cases with Claude Code on the chosen model and saves stream-json transcripts to evals/runs/.
// Usage (from anywhere, with the Node you want the skill to run on active):
//   node .claude/skills/wikipedia-interest-analysis/evals/run.ts [--model haiku] [--repeat 3] [id ...]      (no ids = all cases)
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, rmSync, symlinkSync, type WriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EvalCase } from './types/eval-case.ts';
import type { EvalFile } from './types/eval-file.ts';
import type { EvalRun } from './types/eval-run.ts';

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(here, '..');
const { evals }: EvalFile = JSON.parse(readFileSync(join(here, 'evals.json'), 'utf8'));
const date = new Date().toISOString().slice(0, 10);
const runsDir = join(here, 'runs');
mkdirSync(runsDir, { recursive: true });

// The skill's `node` calls use the same Node as this script (claude -p would otherwise pick the shell default).
const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
const TOOLS = 'Skill,Read,Bash(node:*),Bash(npm ci:*)';
// Evals must not see the developer's auto-memory about this project: a real user's session would not have it.
const SETTINGS = JSON.stringify({ autoMemoryEnabled: false });
const PARALLEL = 3;

const argv = process.argv.slice(2);

function takeOption(name: string, fallback: string): string {
  const index = argv.indexOf(name);

  return index >= 0 ? argv.splice(index, 2)[1] : fallback;
}

const MODEL = takeOption('--model', 'haiku');
const REPEAT = Number(takeOption('--repeat', '3'));
const workRoot = join(tmpdir(), 'wiki-evals', date);

/** A fresh project folder per run with only this skill installed: runs can't see each other's output or the developer's files. */
function workspace(name: string): string {
  const dir = join(workRoot, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, '.claude', 'skills'), { recursive: true });
  symlinkSync(skillDir, join(dir, '.claude', 'skills', 'wikipedia-interest-analysis'));

  return dir;
}

/** One claude -p call; appends its stream to `out` and returns the session id it ended in. */
function runClaude(args: string[], out: WriteStream, cwd: string): Promise<string> {
  return new Promise((finish, fail) => {
    const child = spawn('claude', ['-p', ...args, '--model', MODEL, '--output-format', 'stream-json', '--verbose', '--settings', SETTINGS, '--allowedTools', TOOLS], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let transcript = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out.write(chunk);
      transcript += chunk;
    });
    child.on('error', fail);
    child.on('close', (exitCode) => {
      const sessionIds = [...transcript.matchAll(/"session_id":\s*"([^"]+)"/g)];

      if (exitCode === 0 && sessionIds.length) {
        finish(sessionIds.at(-1)![1]);
      } else {
        fail(new Error(`claude exited with ${exitCode}`));
      }
    });
  });
}

let active = 0;
const queue: (() => void)[] = [];

function limit<Result>(task: () => Promise<Result>): Promise<Result> {
  return new Promise((finish, fail) => {
    const start = () => {
      active++;
      task().then(finish, fail).finally(() => {
        active--;
        queue.shift()?.();
      });
    };

    if (active < PARALLEL) {
      start();
    } else {
      queue.push(start);
    }
  });
}

const byId = new Map(evals.map((evalCase) => [evalCase.id, evalCase]));

function findCase(id: string): EvalCase {
  const evalCase = byId.get(id);

  if (!evalCase) {
    throw new Error(`Unknown eval id: ${id}`);
  }

  return evalCase;
}

const selected = argv.length ? argv.map(findCase) : evals;
// A case that continues another one needs that one to run first.
const toRun = [...new Set(selected.flatMap((evalCase) => (evalCase.after ? [findCase(evalCase.after), evalCase] : [evalCase])))];
const done = new Map<string, Promise<EvalRun>>();

for (let repeat = 1; repeat <= REPEAT; repeat++) {
  for (const evalCase of toRun) {
    done.set(`${evalCase.id}#${repeat}`, limit(async () => {
      const started = Date.now();
      const out = createWriteStream(join(runsDir, `${evalCase.id}-${date}-${MODEL}-r${repeat}.jsonl`));
      // A resumed session only exists in the folder it was created in, so a follow-up reuses its parent's workspace.
      const parent = evalCase.after ? await done.get(`${evalCase.after}#${repeat}`)! : null;
      const dir = parent?.dir ?? workspace(`${evalCase.id}-r${repeat}`);
      let session = await runClaude([evalCase.prompt, ...(parent ? ['--resume', parent.session, '--fork-session'] : [])], out, dir);

      if (evalCase.reply) {
        session = await runClaude([evalCase.reply, '--resume', session], out, dir);
      }

      out.end();
      console.error(`✓ ${evalCase.id} r${repeat} (${Math.round((Date.now() - started) / 1000)}s) ${dir}`);

      return { session, dir };
    }));
  }
}

const keys = [...done.keys()];
const results = await Promise.allSettled(done.values());

for (const [index, outcome] of results.entries()) {
  if (outcome.status === 'rejected') {
    console.error(`✗ ${keys[index]}: ${outcome.reason.message}`);
  }
}
