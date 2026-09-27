import type { ParsedBasket } from '../types/parsed-basket.ts';
import { MAX_BASKET_SIZE } from './max-basket-size.ts';
import { splitCsv } from './split-csv.ts';
import { UsageError } from './usage-error.ts';

/** "astronomy=Q333,Q589;chemistry=Q2329,…" → [{ name, qids }] */
export function parseBasket(value: string): ParsedBasket[] {
  return value.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, list = ''] = part.split('=');
    const qids = splitCsv(list);

    if (!name?.trim() || !qids.length || qids.some((qid) => !/^Q\d+$/.test(qid))) {
      throw new UsageError(`Bad --basket entry "${part}". Expected name=Q1,Q2,… (baskets separated by ;)`);
    }

    if (qids.length > MAX_BASKET_SIZE) {
      throw new UsageError(`Basket "${name}" has ${qids.length} subtopics; the maximum is ${MAX_BASKET_SIZE}.`);
    }

    return { name: name.trim(), qids: [...new Set(qids)] };
  });
}
