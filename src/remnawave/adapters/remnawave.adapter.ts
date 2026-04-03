import { Injectable } from '@nestjs/common';
import { CreateRemnawaveUserDto } from '../dto/create-remnawave-user.dto';
import { CreateRemnawaveUserResult } from '../interfaces/create-user-result.interface';

@Injectable()
export class RemnawaveAdapter {
  // TODO: Уточнить точные поля/формат payload согласно актуальной версии Remnawave API.
  toCreateUserPayload(dto: CreateRemnawaveUserDto) {
    return {
      username: dto.username,
      squadId: dto.squadId,
      expiresAt: dto.expiresAt.toISOString(),
    };
  }

  // TODO: Уточнить точные поля ответа create user в вашей версии Remnawave API.
  fromCreateUserResponse(data: unknown): CreateRemnawaveUserResult | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, unknown>;
    const userId =
      payload.id ??
      (payload.user as Record<string, unknown> | undefined)?.id ??
      (payload.data as Record<string, unknown> | undefined)?.id;

    if (!userId) {
      return null;
    }

    const subscriptionUrl =
      payload.subscriptionUrl ??
      payload.subscription_url ??
      payload.url ??
      payload.link ??
      (payload.subscription as Record<string, unknown> | undefined)?.url ??
      (payload.data as Record<string, unknown> | undefined)?.subscriptionUrl ??
      (payload.data as Record<string, unknown> | undefined)?.subscription_url ??
      (payload.data as Record<string, unknown> | undefined)?.url;

    return {
      userId: String(userId),
      subscriptionUrl:
        typeof subscriptionUrl === 'string' && subscriptionUrl.length > 0
          ? subscriptionUrl
          : undefined,
    };
  }

  // TODO: Уточнить endpoint/поля обновления срока действия пользователя.
  toUpdateExpiryPayload(expiresAt: Date) {
    return {
      expiresAt: expiresAt.toISOString(),
    };
  }
}
