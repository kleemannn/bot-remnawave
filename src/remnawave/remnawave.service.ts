import { isAxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RemnawaveAdapter } from './adapters/remnawave.adapter';
import { CreateRemnawaveUserDto } from './dto/create-remnawave-user.dto';
import { CreateRemnawaveUserResult } from './interfaces/create-user-result.interface';

@Injectable()
export class RemnawaveService {
  private readonly logger = new Logger(RemnawaveService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly adapter: RemnawaveAdapter,
  ) {}

  async createUser(dto: CreateRemnawaveUserDto): Promise<CreateRemnawaveUserResult> {
    const baseUrl = this.configService.getOrThrow<string>('remnawave.baseUrl');
    const token = this.configService.getOrThrow<string>('remnawave.token');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/users`,
          this.adapter.toCreateUserPayload(dto),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
          },
        ),
      );

      const mapped = this.adapter.fromCreateUserResponse(response.data);
      if (!mapped) {
        this.logger.error('Remnawave API did not return user id', response.data);
        throw new InternalServerErrorException('Не удалось создать пользователя в Remnawave');
      }

      return mapped;
    } catch (error) {
      this.logger.error('Remnawave createUser failed', error);
      throw new InternalServerErrorException('Ошибка Remnawave API при создании пользователя');
    }
  }

  async disableUser(remnawaveUserId: string): Promise<void> {
    await this.postWithoutResult(`/users/${remnawaveUserId}/disable`, 'disableUser');
  }

  async enableUser(remnawaveUserId: string): Promise<void> {
    await this.postWithoutResult(`/users/${remnawaveUserId}/enable`, 'enableUser');
  }

  async deleteUser(remnawaveUserId: string): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('remnawave.baseUrl');
    const token = this.configService.getOrThrow<string>('remnawave.token');

    try {
      await firstValueFrom(
        this.httpService.delete(`${baseUrl}/users/${remnawaveUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
        }),
      );
    } catch (error) {
      this.logger.error('Remnawave deleteUser failed', error);
      throw new InternalServerErrorException('Ошибка Remnawave API при удалении пользователя');
    }
  }

  async updateUserExpiry(remnawaveUserId: string, expiresAt: Date): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('remnawave.baseUrl');
    const token = this.configService.getOrThrow<string>('remnawave.token');

    try {
      await firstValueFrom(
        this.httpService.patch(
          `${baseUrl}/users/${remnawaveUserId}`,
          this.adapter.toUpdateExpiryPayload(expiresAt),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
          },
        ),
      );
    } catch (error) {
      this.logger.error('Remnawave updateUserExpiry failed', error);
      throw new InternalServerErrorException('Ошибка Remnawave API при обновлении срока подписки');
    }
  }

  async userExists(remnawaveUserId: string): Promise<boolean> {
    const baseUrl = this.configService.getOrThrow<string>('remnawave.baseUrl');
    const token = this.configService.getOrThrow<string>('remnawave.token');

    try {
      await firstValueFrom(
        this.httpService.get(`${baseUrl}/users/${remnawaveUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
        }),
      );

      return true;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return false;
      }

      this.logger.error('Remnawave userExists failed', error);
      throw new InternalServerErrorException(
        'Ошибка Remnawave API при проверке пользователя',
      );
    }
  }

  private async postWithoutResult(path: string, operation: string): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('remnawave.baseUrl');
    const token = this.configService.getOrThrow<string>('remnawave.token');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${baseUrl}${path}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: this.configService.get<number>('remnawave.timeoutMs', 10000),
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Remnawave ${operation} failed`, error);
      throw new InternalServerErrorException('Ошибка Remnawave API');
    }
  }
}
