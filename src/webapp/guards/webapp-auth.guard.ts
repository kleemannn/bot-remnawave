import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { WebappAuthService } from '../webapp-auth.service';
import { WebappAuthenticatedRequest } from '../interfaces/webapp-authenticated-request.interface';

@Injectable()
export class WebappAuthGuard implements CanActivate {
  constructor(private readonly webappAuthService: WebappAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<WebappAuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new ForbiddenException('Требуется авторизация Mini App.');
    }

    request.webappUser = this.webappAuthService.verifyAccessToken(token);
    return true;
  }
}
