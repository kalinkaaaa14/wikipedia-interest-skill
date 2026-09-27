import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The skill's root folder (the one with SKILL.md), wherever the command is run from. */
export const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
