import { Injectable } from '@nestjs/common';
import { CreateRemnawaveUserDto } from '../dto/create-remnawave-user.dto';
import { CreateRemnawaveUserResult } from '../interfaces/create-user-result.interface';

@Injectable()
export class RemnawaveAdapter {
  toCreateUserPayload(dto: CreateRemnawaveUserDto) {
    return {
      username: dto.username,
      activeInternalSquads: [dto.squadId],
      squadId: dto.squadId,
      ...(dto.tag ? { tag: dto.tag } : {}),
      expireAt: dto.expiresAt.toISOString(),
    };
  }

  fromCreateUserResponse(data: unknown): CreateRemnawaveUserResult | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, unknown>;
    const response =
      (payload.response as Record<string, unknown> | undefined) ?? payload;

    const userId =
      response.uuid ??
      response.id ??
      (response.user as Record<string, unknown> | undefined)?.id ??
      (response.data as Record<string, unknown> | undefined)?.id;

    if (!userId) {
      return null;
    }

    const subscriptionUrl =
      response.subscriptionUrl ??
      response.subscription_url ??
      response.url ??
      response.link ??
      (response.subscription as Record<string, unknown> | undefined)?.url ??
      (response.data as Record<string, unknown> | undefined)?.subscriptionUrl ??
      (response.data as Record<string, unknown> | undefined)?.subscription_url ??
      (response.data as Record<string, unknown> | undefined)?.url;

    return {
      userId: String(userId),
      subscriptionUrl:
        typeof subscriptionUrl === 'string' && subscriptionUrl.length > 0
          ? subscriptionUrl
          : undefined,
    };
  }

  toUpdateExpiryPayload(expiresAt: Date) {
    return {
      expireAt: expiresAt.toISOString(),
    };
  }
}
