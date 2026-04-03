import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DuplicateActionException,
  ExternalServiceException,
  InvalidCallbackDataException,
  RateLimitExceededException,
} from './app-exceptions';

@Injectable()
export class BotErrorMapperService {
  toUserMessage(error: unknown): string {
    if (error instanceof RateLimitExceededException) {
      return error.message;
    }

    if (error instanceof DuplicateActionException) {
      return error.message;
    }

    if (error instanceof InvalidCallbackDataException) {
      return error.message;
    }

    if (error instanceof BadRequestException) {
      return this.extractHttpMessage(error, 'Проверьте введенные данные и попробуйте снова.');
    }

    if (error instanceof ForbiddenException) {
      return this.extractHttpMessage(error, 'У вас нет прав для этого действия.');
    }

    if (error instanceof NotFoundException) {
      return this.extractHttpMessage(error, 'Ничего не найдено.');
    }

    if (error instanceof ExternalServiceException) {
      if (error.isTimeout) {
        return 'Внешний сервис не ответил вовремя. Попробуйте еще раз через минуту.';
      }

      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return 'Внешний сервис отклонил запрос. Проверьте данные и повторите попытку.';
      }

      return 'Внешний сервис временно недоступен. Попробуйте чуть позже.';
    }

    if (error instanceof Error) {
      return error.message || 'Внутренняя ошибка. Попробуйте позже.';
    }

    return 'Внутренняя ошибка. Попробуйте позже.';
  }

  private extractHttpMessage(error: BadRequestException | ForbiddenException | NotFoundException, fallback: string) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const message = (response as { message?: string | string[] }).message;
      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message) && message.length > 0) {
        return message.join('; ');
      }
    }

    return fallback;
  }
}
