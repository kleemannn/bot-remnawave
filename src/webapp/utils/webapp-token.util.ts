import { createHmac, timingSafeEqual } from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { WebappJwtPayload } from '../interfaces/webapp-jwt-payload.interface';

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export function signWebappToken(
  payload: WebappJwtPayload,
  secret: string,
): string {
  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyWebappToken(token: string, secret: string): WebappJwtPayload {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new ForbiddenException('Недействительная сессия Mini App.');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new ForbiddenException('Недействительная сессия Mini App.');
  }

  let payload: WebappJwtPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as WebappJwtPayload;
  } catch {
    throw new ForbiddenException('Недействительная сессия Mini App.');
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new ForbiddenException('Сессия Mini App истекла.');
  }

  return payload;
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}
