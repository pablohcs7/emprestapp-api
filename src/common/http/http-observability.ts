import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

type AuthenticatedUser = {
  sub?: string;
  email?: string;
};

type ObservableHeaders = Record<string, string | string[] | undefined> & {
  origin?: string;
  referer?: string;
  'user-agent'?: string;
  'x-request-id'?: string | string[];
};

type RequestRoute = {
  path?: string;
};

type RequestSocket = {
  remoteAddress?: string | null;
};

export type HttpRequestContext = {
  requestId: string;
  startedAt: string;
  startedAtMs: number;
};

export type HttpErrorContext = {
  code: string;
  message: string;
  details: unknown;
};

export type ObservableRequest = {
  headers: ObservableHeaders;
  ip?: string;
  method: string;
  originalUrl?: string;
  route?: RequestRoute;
  socket: RequestSocket;
  url: string;
  requestContext?: HttpRequestContext;
  user?: AuthenticatedUser;
};

export type ObservableResponse = {
  json: (body: unknown) => void;
  locals?: {
    httpError?: HttpErrorContext;
  };
  on: (event: 'finish', listener: () => void) => void;
  getHeader: (name: string) => unknown;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ObservableResponse;
  statusCode: number;
};

type NextFunction = () => void;

const HTTP_ACCESS_LOGGER_CONTEXT = 'HttpAccess';
const HTTP_ERROR_LOGGER_CONTEXT = 'HttpError';
const httpAccessLogger = new Logger(HTTP_ACCESS_LOGGER_CONTEXT);
const httpErrorLogger = new Logger(HTTP_ERROR_LOGGER_CONTEXT);

export function attachHttpObservability(
  request: ObservableRequest,
  response: ObservableResponse,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(request.headers['x-request-id']);
  const startedAtMs = Date.now();

  request.requestContext = {
    requestId,
    startedAt: new Date(startedAtMs).toISOString(),
    startedAtMs,
  };

  response.setHeader('x-request-id', requestId);

  response.on('finish', () => {
    const user = request.user;
    const baseLog = {
      event: 'http_request_completed',
      timestamp: new Date().toISOString(),
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      route: request.route?.path ?? null,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAtMs,
      ip: request.ip ?? request.socket.remoteAddress ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      referer: request.headers.referer ?? null,
      origin: request.headers.origin ?? null,
      contentLength: response.getHeader('content-length') ?? null,
      userId: user?.sub ?? null,
      userEmail: user?.email ?? null,
      errorCode: response.locals?.httpError?.code ?? null,
      errorMessage: response.locals?.httpError?.message ?? null,
    };

    logHttpAccess(response.statusCode, baseLog);
  });

  next();
}

export function logHttpException(
  request: ObservableRequest,
  response: ObservableResponse,
  payload: HttpErrorContext,
  exception?: Error,
): void {
  response.locals ??= {};
  response.locals.httpError = payload;

  const requestId = request.requestContext?.requestId ?? null;
  const message = JSON.stringify({
    event: 'http_request_failed',
    timestamp: new Date().toISOString(),
    requestId,
    method: request.method,
    path: request.originalUrl ?? request.url,
    statusCode: response.statusCode,
    errorCode: payload.code,
    errorMessage: payload.message,
    details: payload.details,
    userId: request.user?.sub ?? null,
    userEmail: request.user?.email ?? null,
  });

  if (response.statusCode >= 500) {
    httpErrorLogger.error(message, exception?.stack);
    return;
  }

  httpErrorLogger.warn(message);
}

function logHttpAccess(statusCode: number, payload: Record<string, unknown>) {
  const message = JSON.stringify(payload);

  if (statusCode >= 500) {
    httpAccessLogger.error(message);
    return;
  }

  if (statusCode >= 400) {
    httpAccessLogger.warn(message);
    return;
  }

  httpAccessLogger.log(message);
}

function resolveRequestId(headerValue: string | string[] | undefined): string {
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue)) {
    const firstValue = headerValue.find((value) => value.trim());

    if (firstValue) {
      return firstValue.trim();
    }
  }

  return randomUUID();
}
