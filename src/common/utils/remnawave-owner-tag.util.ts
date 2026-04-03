export function buildRemnawaveOwnerTag(
  username: string | null,
  telegramId: bigint,
): string {
  const normalized = (username ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16)
    .replace(/_+$/g, '');

  if (normalized) {
    return normalized;
  }

  return `DEALER_${telegramId.toString().slice(-9)}`;
}
