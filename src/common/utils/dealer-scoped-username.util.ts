const DEALER_SCOPED_USERNAME_MAX_LENGTH = 64;

export function buildDealerScopedUsername(
  dealerUsername: string | null,
  dealerTelegramId: bigint,
  username: string,
): string {
  const prefix = buildDealerUsernamePrefix(dealerUsername, dealerTelegramId);
  const normalizedUsername = username.trim().replace(/^@+/, '').replace(/\s+/g, '');
  const expectedPrefix = `${prefix}_`;

  if (
    normalizedUsername
      .toLowerCase()
      .startsWith(expectedPrefix.toLowerCase())
  ) {
    return normalizedUsername.slice(0, DEALER_SCOPED_USERNAME_MAX_LENGTH);
  }

  const usernameMaxLength = Math.max(
    DEALER_SCOPED_USERNAME_MAX_LENGTH - expectedPrefix.length,
    1,
  );

  return `${expectedPrefix}${normalizedUsername.slice(0, usernameMaxLength)}`;
}

function buildDealerUsernamePrefix(
  dealerUsername: string | null,
  dealerTelegramId: bigint,
): string {
  const normalizedDealerUsername = (dealerUsername ?? '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .trim();

  if (normalizedDealerUsername.length >= 2) {
    return formatPrefix(normalizedDealerUsername.slice(0, 2));
  }

  if (normalizedDealerUsername.length === 1) {
    const fallbackSuffix = dealerTelegramId.toString().slice(-1);
    return formatPrefix(`${normalizedDealerUsername}${fallbackSuffix}`);
  }

  return `D${dealerTelegramId.toString().slice(-2)}`;
}

function formatPrefix(value: string): string {
  const first = value.slice(0, 1).toUpperCase();
  const rest = value.slice(1).toLowerCase();
  return `${first}${rest}`;
}
