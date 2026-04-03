export class ExternalServiceException extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly operation: string,
    public readonly statusCode?: number,
    public readonly isTimeout = false,
  ) {
    super(message);
    this.name = 'ExternalServiceException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitExceededException extends Error {
  constructor(message = 'Слишком много запросов. Попробуйте чуть позже.') {
    super(message);
    this.name = 'RateLimitExceededException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DuplicateActionException extends Error {
  constructor(message = 'Действие уже выполняется. Подождите пару секунд.') {
    super(message);
    this.name = 'DuplicateActionException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCallbackDataException extends Error {
  constructor(message = 'Кнопка устарела или повреждена. Откройте меню заново.') {
    super(message);
    this.name = 'InvalidCallbackDataException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
