import type { BasketMemberResult } from './basket-member-result.ts';

export type BasketBreakdown = {
  members: BasketMemberResult[];
  excluded: string[];
};
