import type { BasketMemberResult } from '../../types/basket-member-result.ts';
import type { Direction } from '../../types/direction.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import { formatSignedPercent } from '../analyze/format-signed-percent.ts';

const MAX_NAMES = 5;

function listMembers(members: BasketMemberResult[], direction: Direction): string {
  const matching = members.filter((member) => member.direction === direction);
  const shown = matching.slice(0, MAX_NAMES).map((member) => `${member.label} ${formatSignedPercent(member.yoyShareRobustPct)}`);
  const more = matching.length > MAX_NAMES ? ` +${matching.length - MAX_NAMES} more` : '';

  return shown.length ? `${direction}: ${shown.join(', ')}${more}` : '';
}

/** One line per basket for the PDF: which subtopics grow and which decline, biggest first. */
export function describeBasketForReport(series: SeriesResult): string {
  const members = series.basket?.members ?? [];
  const parts = [listMembers(members, 'growing'), listMembers(members, 'declining')].filter(Boolean);
  const summary = parts.length ? parts.join('; ') : 'no subtopic clearly growing or declining';
  const excluded = series.basket?.excluded.length ? `; not in every language: ${series.basket.excluded.length}` : '';

  return `${series.label} — ${summary}${excluded}`;
}
