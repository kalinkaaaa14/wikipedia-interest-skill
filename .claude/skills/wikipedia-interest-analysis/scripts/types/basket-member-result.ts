import type { Direction } from './direction.ts';

export type BasketMemberResult = {
  qid: string;
  label: string;
  shareOfBasketPct: number;
  yoyShareRobustPct: number | null;
  direction?: Direction;
};
