import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
}

export const toSuccessResponse = <T>(data: T): ApiResponseEnvelope<T> => ({
  success: true,
  data,
  error: null,
});

@Injectable()
export class ApiEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseEnvelope<T>> {
    return next.handle().pipe(map((data) => toSuccessResponse(data)));
  }
}
