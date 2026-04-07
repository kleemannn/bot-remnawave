import { Request } from 'express';
import { WebappJwtPayload } from './webapp-jwt-payload.interface';

export interface WebappAuthenticatedRequest extends Request {
  webappUser: WebappJwtPayload;
}
