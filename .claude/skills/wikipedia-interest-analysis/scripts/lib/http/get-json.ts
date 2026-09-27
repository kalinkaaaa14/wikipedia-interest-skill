import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { FetchOptions } from '../../types/fetch-options.ts';
import { SKILL_DIR } from '../skill-dir.ts';

// Wikimedia requires a descriptive User-Agent, otherwise requests get 403.
// Override with WIKI_SKILL_UA="your-app/1.0 (contact)".
const USER_AGENT = process.env.WIKI_SKILL_UA ?? 'wikipedia-interest-analysis-skill/0.1 (Agent Skill; https://agentskills.io)';
const CACHE_DIR = process.env.WIKI_SKILL_CACHE ?? join(SKILL_DIR, '.cache');

class HttpError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.url = url;
  }
}

function cachePath(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex');

  return join(CACHE_DIR, hash.slice(0, 2), `${hash}.json`);
}

async function readCache(url: string, ttlSeconds: number): Promise<unknown | undefined> {
  const file = cachePath(url);

  try {
    const fileStats = await stat(file);

    if (Number.isFinite(ttlSeconds) && (Date.now() - fileStats.mtimeMs) / 1000 > ttlSeconds) {
      return undefined;
    }

    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return undefined;
  }
}

async function writeCache(url: string, body: unknown): Promise<void> {
  const file = cachePath(url);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(body));
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((wake) => setTimeout(wake, milliseconds));
}

/**
 * GET JSON with a disk cache and retry/backoff on 429/5xx.
 * 404 responses are cached too (as null): "no data" is a stable answer for pageviews.
 */
export async function getJson<Body>(url: string, options: FetchOptions): Promise<Body | null> {
  const cached = await readCache(url, options.ttlSeconds);

  if (cached !== undefined) {
    return cached as Body | null;
  }

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });

    if (response.ok) {
      const body = (await response.json()) as Body;
      await writeCache(url, body);

      return body;
    }

    if (response.status === 404) {
      await writeCache(url, null);

      return null;
    }

    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
      continue;
    }

    throw new HttpError(response.status, url);
  }
}
