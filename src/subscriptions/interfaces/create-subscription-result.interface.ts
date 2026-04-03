import { Subscription } from '@prisma/client';

export interface CreateSubscriptionResult {
  subscription: Subscription;
  subscriptionUrl?: string;
  happEncryptedUrl?: string;
}
