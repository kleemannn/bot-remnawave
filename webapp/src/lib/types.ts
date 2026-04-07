export type DealerTag = 'STANDARD' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DELETED' | 'DISABLED';

export interface AuthUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface DealerProfile {
  telegramId: string;
  username: string | null;
  tag: DealerTag;
  isActive: boolean;
  expiresAt: string;
  keyLimit: number;
  createdCount: number;
  remainingCount: number;
  activeSubscriptions: number;
  daysUntilExpiry: number;
}

export interface DashboardPayload {
  user: AuthUser;
  profile: DealerProfile;
  stats: {
    activeSubscriptions: number;
    remainingLimit: number;
    expiresInDays: number;
  };
}

export interface SubscriptionListItem {
  id: string;
  username: string;
  status: SubscriptionStatus;
  expiresAt: string;
  createdAt?: string;
}

export interface SubscriptionDetail extends SubscriptionListItem {
  dealerTag: DealerTag;
  createdBy: string;
  daysLeft: number;
  subscriptionUrl?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export interface CreateSubscriptionPayload {
  username: string;
  days: number;
}

export interface CreateSubscriptionResponse {
  subscription: SubscriptionDetail;
  subscriptionUrl?: string | null;
  happEncryptedUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  profile?: DealerProfile;
}
