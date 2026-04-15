import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ExternalServiceException } from '../common/errors/app-exceptions';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { RemnawaveAdapter } from './adapters/remnawave.adapter';
import { CreateRemnawaveUserDto } from './dto/create-remnawave-user.dto';
import { CreateRemnawaveUserResult } from './interfaces/create-user-result.interface';

interface RemnawaveUserState {
  exists: boolean;
  status?: string;
  expireAt?: Date;
  subscriptionUrl?: string;
  usedTrafficBytes?: number;
  isOnlineNow?: boolean;
}

export interface RemnawaveHost {
  uuid: string;
  remark: string;
  address: string;
  port?: number;
  host?: string | null;
  tag?: string | null;
  isDisabled?: boolean;
}

type RemnawaveMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

@Injectable()
export class RemnawaveService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly adapter: RemnawaveAdapter,
    private readonly logger: AppLoggerService,
  ) {}

  async createUser(dto: CreateRemnawaveUserDto): Promise<CreateRemnawaveUserResult> {
    const responseData = await this.request<unknown>({
      method: 'POST',
      path: '/users',
      operation: 'createUser',
      data: this.adapter.toCreateUserPayload(dto),
      safeToRetry: false,
    });

    const mapped = this.adapter.fromCreateUserResponse(responseData);
    if (!mapped) {
      this.logger.errorEvent(
        'remnawave_create_user_invalid_response',
        {
          username: dto.username,
        },
        undefined,
        RemnawaveService.name,
      );
      throw new ExternalServiceException(
        'Remnawave вернул некорректный ответ при создании пользователя.',
        'remnawave',
        'createUser',
      );
    }

    return mapped;
  }

  async disableUser(remnawaveUserId: string): Promise<void> {
    await this.postWithoutResult(
      `/users/${remnawaveUserId}/actions/disable`,
      'disableUser',
    );
  }

  async enableUser(remnawaveUserId: string): Promise<void> {
    await this.postWithoutResult(
      `/users/${remnawaveUserId}/actions/enable`,
      'enableUser',
    );
  }

  async deleteUser(remnawaveUserId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      path: `/users/${remnawaveUserId}`,
      operation: 'deleteUser',
      safeToRetry: true,
      allow404: true,
    });
  }

  async updateUserExpiry(remnawaveUserId: string, expiresAt: Date): Promise<void> {
    await this.request({
      method: 'PATCH',
      path: '/users',
      operation: 'updateUserExpiry',
      data: this.adapter.toUpdateExpiryPayload(remnawaveUserId, expiresAt),
      safeToRetry: true,
    });
  }

  async userExists(remnawaveUserId: string): Promise<boolean> {
    const state = await this.getUserState(remnawaveUserId);
    return state.exists;
  }

  async getUserState(remnawaveUserId: string): Promise<RemnawaveUserState> {
    const responseData = await this.request<unknown>({
      method: 'GET',
      path: `/users/${remnawaveUserId}`,
      operation: 'getUserState',
      safeToRetry: true,
      allow404: true,
    });

    if (responseData === null) {
      return { exists: false };
    }

    return this.parseUserState(responseData);
  }

  async getUserSubscriptionUrl(remnawaveUserId: string): Promise<string | null> {
    const state = await this.getUserState(remnawaveUserId);
    return state.subscriptionUrl ?? null;
  }

  async getAllHosts(): Promise<RemnawaveHost[]> {
    const responseData = await this.request<unknown>({
      method: 'GET',
      path: '/hosts',
      operation: 'getAllHosts',
      safeToRetry: true,
    });

    return this.parseHostsResponse(responseData);
  }

  async getAllHostTags(): Promise<string[]> {
    const responseData = await this.request<unknown>({
      method: 'GET',
      path: '/hosts/tags',
      operation: 'getAllHostTags',
      safeToRetry: true,
    });

    return this.parseHostTagsResponse(responseData);
  }

  async updateHostAddress(hostUuid: string, address: string): Promise<RemnawaveHost> {
    const responseData = await this.request<unknown>({
      method: 'PATCH',
      path: '/hosts',
      operation: 'updateHost',
      data: {
        uuid: hostUuid,
        address,
      },
      safeToRetry: true,
    });

    const host = this.parseHostResponse(responseData);
    if (!host) {
      throw new ExternalServiceException(
        'Remnawave вернул некорректный ответ при обновлении хоста.',
        'remnawave',
        'updateHost',
      );
    }

    return host;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const response = (error as { response?: { status?: unknown } }).response;
    return typeof response?.status === 'number' ? response.status : undefined;
  }

  private parseUserState(data: unknown): RemnawaveUserState {
    if (!data || typeof data !== 'object') {
      return { exists: true };
    }

    const payload = data as Record<string, unknown>;
    const response =
      (payload.response as Record<string, unknown> | undefined) ?? payload;
    const nested =
      (response.data as Record<string, unknown> | undefined) ?? response;

    const statusCandidate =
      response.status ?? nested.status;
    const expireAtCandidate =
      response.expireAt ??
      response.expiresAt ??
      nested.expireAt ??
      nested.expiresAt;
    const usedTrafficCandidate = this.pickFirstDefined([
      response.usedTrafficBytes,
      response.usedTraffic,
      response.used_traffic,
      response.trafficUsedBytes,
      response.trafficUsed,
      response.traffic_used,
      (response.traffic as Record<string, unknown> | undefined)?.usedBytes,
      (response.traffic as Record<string, unknown> | undefined)?.used,
      nested.usedTrafficBytes,
      nested.usedTraffic,
      nested.used_traffic,
      nested.trafficUsedBytes,
      nested.trafficUsed,
      nested.traffic_used,
      (nested.traffic as Record<string, unknown> | undefined)?.usedBytes,
      (nested.traffic as Record<string, unknown> | undefined)?.used,
    ]);
    const onlineCandidate = this.pickFirstDefined([
      response.isOnline,
      response.online,
      response.is_online,
      response.connected,
      response.activeNow,
      response.active_now,
      (response.session as Record<string, unknown> | undefined)?.isOnline,
      (response.session as Record<string, unknown> | undefined)?.online,
      nested.isOnline,
      nested.online,
      nested.is_online,
      nested.connected,
      nested.activeNow,
      nested.active_now,
      (nested.session as Record<string, unknown> | undefined)?.isOnline,
      (nested.session as Record<string, unknown> | undefined)?.online,
    ]);

    const expireAt =
      typeof expireAtCandidate === 'string' || expireAtCandidate instanceof Date
        ? new Date(expireAtCandidate)
        : undefined;

    return {
      exists: true,
      status: typeof statusCandidate === 'string' ? statusCandidate : undefined,
      expireAt:
        expireAt && !Number.isNaN(expireAt.getTime()) ? expireAt : undefined,
      subscriptionUrl: this.adapter.fromCreateUserResponse(data)?.subscriptionUrl,
      usedTrafficBytes: this.parseNumberCandidate(usedTrafficCandidate),
      isOnlineNow: this.parseBooleanCandidate(onlineCandidate),
    };
  }

  private parseHostsResponse(data: unknown): RemnawaveHost[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const payload = data as Record<string, unknown>;
    const response = payload.response ?? payload.data ?? payload;
    const items: unknown[] = Array.isArray(response)
      ? response
      : Array.isArray((response as Record<string, unknown> | undefined)?.data)
        ? ((response as Record<string, unknown>).data as unknown[])
        : [];

    return items
      .map((item: unknown) => this.parseHostRecord(item))
      .filter((item): item is RemnawaveHost => Boolean(item));
  }

  private parseHostResponse(data: unknown): RemnawaveHost | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, unknown>;
    const response = payload.response ?? payload.data ?? payload;
    return this.parseHostRecord(response);
  }

  private parseHostRecord(data: unknown): RemnawaveHost | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as Record<string, unknown>;
    const uuid = payload.uuid;
    const remark = payload.remark;
    const address = payload.address;

    if (typeof uuid !== 'string' || typeof remark !== 'string' || typeof address !== 'string') {
      return null;
    }

    return {
      uuid,
      remark,
      address,
      port: typeof payload.port === 'number' ? payload.port : undefined,
      host: typeof payload.host === 'string' ? payload.host : null,
      tag: typeof payload.tag === 'string' ? payload.tag : null,
      isDisabled: typeof payload.isDisabled === 'boolean' ? payload.isDisabled : undefined,
    };
  }

  private parseHostTagsResponse(data: unknown): string[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const payload = data as Record<string, unknown>;
    const response = payload.response ?? payload.data ?? payload;
    const items: unknown[] = Array.isArray(response)
      ? response
      : Array.isArray((response as Record<string, unknown> | undefined)?.data)
        ? ((response as Record<string, unknown>).data as unknown[])
        : [];

    return items
      .filter((item: unknown): item is string => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  private pickFirstDefined(values: unknown[]): unknown {
    return values.find((value) => value !== undefined && value !== null);
  }

  private parseNumberCandidate(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return undefined;
      }

      const parsed = Number(normalized);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return undefined;
  }

  private parseBooleanCandidate(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'online', 'connected', 'active'].includes(normalized)) {
        return true;
      }

      if (['false', '0', 'offline', 'disconnected', 'inactive'].includes(normalized)) {
        return false;
      }
    }

    return undefined;
  }

  private async postWithoutResult(path: string, operation: string): Promise<void> {
    await this.request({
      method: 'POST',
      path,
      operation,
      data: {},
      safeToRetry: true,
    });
  }

  private async request<T>(options: {
    method: RemnawaveMethod;
    path: string;
    operation: string;
    data?: unknown;
    safeToRetry?: boolean;
    allow404?: boolean;
  }): Promise<T | null> {
    const maxAttempts = options.safeToRetry
      ? Math.max(this.configService.get<number>('remnawave.retryCount', 1) + 1, 1)
      : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        this.logger.debugEvent(
          'remnawave_request_started',
          {
            operation: options.operation,
            method: options.method,
            path: options.path,
            attempt,
            maxAttempts,
          },
          RemnawaveService.name,
        );

        const response = await firstValueFrom(
          this.httpService.request<T>({
            method: options.method,
            url: `${this.getBaseUrl()}${options.path}`,
            data: options.data,
            headers: this.getHeaders(),
            timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
          }),
        );

        this.logger.debugEvent(
          'remnawave_request_succeeded',
          {
            operation: options.operation,
            method: options.method,
            path: options.path,
            attempt,
            statusCode: response.status,
          },
          RemnawaveService.name,
        );

        return response.data;
      } catch (error) {
        const statusCode = this.getErrorStatus(error);
        const timeout = this.isTimeoutError(error);
        const canRetry =
          Boolean(options.safeToRetry) &&
          attempt < maxAttempts &&
          (timeout || !statusCode || statusCode === 429 || statusCode >= 500);

        if (options.allow404 && statusCode === 404) {
          this.logger.warnEvent(
            'remnawave_request_not_found',
            {
              operation: options.operation,
              path: options.path,
              statusCode,
            },
            RemnawaveService.name,
          );
          return null;
        }

        if (
          options.operation === 'createUser' &&
          statusCode &&
          statusCode >= 400 &&
          statusCode < 500 &&
          this.isDuplicateUsernameError(error)
        ) {
          throw new BadRequestException(
            'Такой пользователь уже существует.',
          );
        }

        const payload = {
          operation: options.operation,
          method: options.method,
          path: options.path,
          attempt,
          maxAttempts,
          statusCode,
          timeout,
          errorCode: this.getErrorCode(error),
          errorMessage: this.getErrorMessage(error),
        };

        if (canRetry) {
          this.logger.warnEvent(
            'remnawave_request_retrying',
            payload,
            RemnawaveService.name,
          );
          await this.delay(
            this.configService.get<number>('remnawave.retryDelayMs', 500),
          );
          continue;
        }

        this.logger.errorEvent(
          'remnawave_request_failed',
          payload,
          error instanceof Error ? error.stack : undefined,
          RemnawaveService.name,
        );

        throw new ExternalServiceException(
          this.getOperationErrorMessage(options.operation),
          'remnawave',
          options.operation,
          statusCode,
          timeout,
        );
      }
    }

    throw new ExternalServiceException(
      this.getOperationErrorMessage(options.operation),
      'remnawave',
      options.operation,
    );
  }

  private getBaseUrl(): string {
    return this.configService
      .getOrThrow<string>('remnawave.baseUrl')
      .replace(/\/+$/, '');
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.configService.getOrThrow<string>('remnawave.token')}`,
      'Content-Type': 'application/json',
    };
  }

  private getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorPayload(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    return (error as { response?: { data?: unknown } }).response?.data;
  }

  private isDuplicateUsernameError(error: unknown): boolean {
    const payload = this.getErrorPayload(error);
    const message = this.stringifyErrorPayload(payload).toLowerCase();

    if (!message) {
      return false;
    }

    const mentionsUsername =
      message.includes('username') || message.includes('user name');
    const mentionsDuplicate =
      message.includes('exist') ||
      message.includes('taken') ||
      message.includes('duplicate') ||
      message.includes('already');

    return mentionsUsername && mentionsDuplicate;
  }

  private stringifyErrorPayload(payload: unknown): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (!payload) {
      return '';
    }

    try {
      return JSON.stringify(payload);
    } catch {
      return '';
    }
  }

  private isTimeoutError(error: unknown): boolean {
    const code = this.getErrorCode(error);
    return code === 'ECONNABORTED' || code === 'ETIMEDOUT';
  }

  private getOperationErrorMessage(operation: string): string {
    switch (operation) {
      case 'createUser':
        return 'Ошибка Remnawave API при создании пользователя';
      case 'deleteUser':
        return 'Ошибка Remnawave API при удалении пользователя';
      case 'disableUser':
        return 'Ошибка Remnawave API при постановке подписки на паузу';
      case 'enableUser':
        return 'Ошибка Remnawave API при возобновлении подписки';
      case 'updateUserExpiry':
        return 'Ошибка Remnawave API при обновлении срока подписки';
      default:
        return 'Ошибка Remnawave API';
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
