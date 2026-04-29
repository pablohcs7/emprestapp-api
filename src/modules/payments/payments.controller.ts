import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/token.service';
import { LoanIdParamsDto } from '../loans/presentation/dto/loan-id-params.dto';
import { PaymentIdParamsDto } from './presentation/dto/payment-id-params.dto';
import { CreatePaymentDto } from './presentation/dto/create-payment.dto';
import { ListPaymentsQueryDto } from './presentation/dto/list-payments-query.dto';
import {
  InstallmentNotFoundError,
  InvalidPaymentAmountError,
  InvalidPaymentSequenceError,
  LoanCanceledError,
  LoanNotFoundError,
  PaymentAlreadyCanceledError,
  PaymentNotFoundError,
  PaymentsApplicationService,
} from './application/payments.application.service';
import { PaymentsReadService } from './application/payments-read.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsApplicationService: PaymentsApplicationService,
    private readonly paymentsReadService: PaymentsReadService,
  ) {}

  @Post('payments')
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() input: CreatePaymentDto,
  ) {
    try {
      return await this.paymentsApplicationService.register(user.sub, input);
    } catch (error) {
      throw mapPaymentErrorToHttpException(error);
    }
  }

  @Get('payments')
  list(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentsReadService.list(user.sub, mapPaymentListFilters(query));
  }

  @Get('loans/:loanId/payments')
  async listByLoan(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: LoanIdParamsDto,
    @Query() query: ListPaymentsQueryDto,
  ) {
    try {
      return await this.paymentsReadService.listByLoan(
        user.sub,
        params.loanId,
        mapPaymentListFilters(query),
      );
    } catch (error) {
      throw mapPaymentErrorToHttpException(error);
    }
  }

  @Post('payments/:paymentId/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: PaymentIdParamsDto,
  ) {
    try {
      return await this.paymentsApplicationService.cancel(
        user.sub,
        params.paymentId,
      );
    } catch (error) {
      throw mapPaymentErrorToHttpException(error);
    }
  }
}

const mapPaymentListFilters = (query: ListPaymentsQueryDto) => ({
  loanId: query.loanId,
  installmentId: query.installmentId,
  status: query.status,
  paidAtFrom: query.paidAtFrom ? new Date(query.paidAtFrom) : undefined,
  paidAtTo: query.paidAtTo ? new Date(query.paidAtTo) : undefined,
  page: query.page,
  pageSize: query.pageSize,
});

const mapPaymentErrorToHttpException = (error: unknown): Error => {
  if (error instanceof LoanNotFoundError) {
    return new NotFoundException({
      code: 'LOAN_NOT_FOUND',
      message: 'Loan not found',
    });
  }

  if (error instanceof InstallmentNotFoundError) {
    return new NotFoundException({
      code: 'INSTALLMENT_NOT_FOUND',
      message: 'Installment not found',
    });
  }

  if (error instanceof PaymentNotFoundError) {
    return new NotFoundException({
      code: 'PAYMENT_NOT_FOUND',
      message: 'Payment not found',
    });
  }

  if (
    error instanceof InvalidPaymentAmountError ||
    error instanceof InvalidPaymentSequenceError ||
    error instanceof LoanCanceledError ||
    error instanceof PaymentAlreadyCanceledError
  ) {
    return new UnprocessableEntityException({
      code: error.code,
      message: error.message,
    });
  }

  return error instanceof Error ? error : new Error('Unexpected payment error');
};
