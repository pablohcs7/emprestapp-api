import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ApiErrorPayload, ApiResponseEnvelope } from '../http/api-envelope.interceptor';
import {
  logHttpException,
  type ObservableRequest,
  type ObservableResponse,
} from '../http/http-observability';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<ObservableRequest>();
    const response = host.switchToHttp().getResponse<ObservableResponse>();
    const { statusCode, body } = mapExceptionToEnvelope(exception);

    response.status(statusCode);
    logHttpException(request, response, body.error ?? unknownHttpError(), toError(exception));
    response.status(statusCode).json(body);
  }
}

const mapExceptionToEnvelope = (
  exception: unknown,
): {
  statusCode: number;
  body: ApiResponseEnvelope<null>;
} => {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const error = exception.getResponse();
    const message = extractMessage(error, exception.message);

    return {
      statusCode,
      body: {
        success: false,
        data: null,
        error: {
          code: extractCode(error, statusCode),
          message,
          details: extractDetails(error),
        },
      },
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: null,
      },
    },
  };
};

const unknownHttpError = (): ApiErrorPayload => ({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Internal server error',
  details: null,
});

const extractMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (isErrorBody(error) && typeof error.message === 'string') {
    return error.message;
  }

  if (
    isErrorBody(error) &&
    Array.isArray(error.message) &&
    error.message.every((item) => typeof item === 'string')
  ) {
    return error.message.join(', ');
  }

  return fallback;
};

const extractDetails = (error: unknown): ApiErrorPayload['details'] => {
  if (!isErrorBody(error)) {
    return null;
  }

  return error.details ?? null;
};

const extractCode = (error: unknown, statusCode: number): string => {
  if (isErrorBody(error) && typeof error.code === 'string') {
    return error.code;
  }

  return HttpStatus[statusCode] ?? 'HTTP_ERROR';
};

const isErrorBody = (
  error: unknown,
): error is { message?: string | string[]; details?: unknown; code?: string } =>
  typeof error === 'object' && error !== null;

const toError = (exception: unknown): Error | undefined =>
  exception instanceof Error ? exception : undefined;
