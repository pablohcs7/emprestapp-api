import { CallHandler, ExecutionContext, HttpException, NotFoundException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { of } from 'rxjs';

import { ApiEnvelopeInterceptor, toSuccessResponse } from '../../src/common/http/api-envelope.interceptor';
import { GlobalHttpExceptionFilter } from '../../src/common/errors/global-http-exception.filter';

describe('api envelope', () => {
  it('wraps successful responses in the standard envelope', () => {
    expect(toSuccessResponse({ id: 'loan-1' })).toEqual({
      success: true,
      data: { id: 'loan-1' },
      error: null,
    });
  });

  it('maps interceptor output to the standard envelope', (done) => {
    const interceptor = new ApiEnvelopeInterceptor();
    const next: CallHandler = {
      handle: () => of({ name: 'EmprestApp' }),
    };

    interceptor
      .intercept({} as ExecutionContext, next)
      .subscribe((value: unknown) => {
        expect(value).toEqual({
          success: true,
          data: { name: 'EmprestApp' },
          error: null,
        });
        done();
      });
  });

  it('maps HTTP exceptions to the standard error envelope', () => {
    const response = createResponseMock();
    const filter = new GlobalHttpExceptionFilter();

    filter.catch(
      new NotFoundException('Loan not found'),
      createArgumentsHostMock(response),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Loan not found',
        details: null,
      },
    });
  });

  it('maps unexpected errors to a safe internal-server envelope', () => {
    const response = createResponseMock();
    const filter = new GlobalHttpExceptionFilter();

    filter.catch(new Error('database exploded'), createArgumentsHostMock(response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: null,
      },
    });
  });
});

const createResponseMock = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createArgumentsHostMock = (
  response: ReturnType<typeof createResponseMock>,
): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({}),
    }),
  }) as ArgumentsHost;
