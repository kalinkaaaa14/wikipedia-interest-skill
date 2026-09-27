import { FIELD_CLASSES } from './field-classes.ts';

/** True when one of an item's classes (P31) marks it as a field of knowledge. */
export function hasFieldClass(classIds: string[]): boolean {
  return classIds.some((classId) => FIELD_CLASSES.has(classId));
}
