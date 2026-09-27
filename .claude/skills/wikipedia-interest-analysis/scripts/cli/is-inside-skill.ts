import { isAbsolute, relative } from 'node:path';
import { SKILL_DIR } from '../lib/skill-dir.ts';

/** True when `dir` is the skill folder or inside it. */
export function isInsideSkill(dir: string, skillDir = SKILL_DIR): boolean {
  const relativePath = relative(skillDir, dir);

  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}
