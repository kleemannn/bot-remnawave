import { Button } from '../keyboards/common.keyboards';

export function buildPaginationRow(options: {
  page: number;
  pageCount: number;
  prevCallback: string;
  nextCallback: string;
  refreshCallback: string;
}): Button[] {
  const row: Button[] = [];

  if (options.page > 1) {
    row.push({ text: '⬅️', callback_data: options.prevCallback });
  }

  row.push({ text: '🔄', callback_data: options.refreshCallback });

  if (options.page < options.pageCount) {
    row.push({ text: '➡️', callback_data: options.nextCallback });
  }

  return row;
}
