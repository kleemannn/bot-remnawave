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
    };
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
