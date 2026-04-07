import { WebappJwtPayload } from './webapp-jwt-payload.interface';

export interface WebappAuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  webappUser: WebappJwtPayload;
}
