import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/token.service';
import {
  ContactNotFoundError as CreateContactNotFoundError,
  ForbiddenLoanResourceError as CreateForbiddenLoanResourceError,
  LoanNotFoundError as CreateLoanNotFoundError,
  LoansApplicationService,
} from './application/loans.application.service';
import {
  ForbiddenLoanResourceError as LifecycleForbiddenLoanResourceError,
  LoanHasPaymentsError,
  LoanLifecyclePolicyService,
  LoanNotFoundError as LifecycleLoanNotFoundError,
} from './application/loan-lifecycle-policy.service';
import { LoansReadService } from './application/loans-read.service';
import { CreateLoanDto } from './presentation/dto/create-loan.dto';
import { LinkLoanContactDto } from './presentation/dto/link-loan-contact.dto';
import { ListLoansQueryDto } from './presentation/dto/list-loans-query.dto';
import { LoanIdParamsDto } from './presentation/dto/loan-id-params.dto';

@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loansApplicationService: LoansApplicationService,
    private readonly loansReadService: LoansReadService,
    private readonly loanLifecyclePolicyService: LoanLifecyclePolicyService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() input: CreateLoanDto,
  ) {
    return this.loansApplicationService.create(user.sub, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: ListLoansQueryDto,
  ) {
    return this.loansReadService.list(user.sub, {
      status: query.status,
      contactId: query.contactId,
      dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
      dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
      periodFrom: query.periodFrom ? new Date(query.periodFrom) : undefined,
      periodTo: query.periodTo ? new Date(query.periodTo) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':loanId')
  async detail(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: LoanIdParamsDto,
  ) {
    try {
      return await this.loansReadService.detail(user.sub, params.loanId);
    } catch (error) {
      throw mapLoanErrorToHttpException(error);
    }
  }

  @Patch(':loanId/link-contact')
  async linkContact(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: LoanIdParamsDto,
    @Body() input: LinkLoanContactDto,
  ) {
    try {
      return await this.loansApplicationService.linkContact(
        user.sub,
        params.loanId,
        input,
      );
    } catch (error) {
      throw mapLoanErrorToHttpException(error);
    }
  }

  @Post(':loanId/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: LoanIdParamsDto,
  ) {
    try {
      return await this.loanLifecyclePolicyService.cancelLoan(
        user.sub,
        params.loanId,
      );
    } catch (error) {
      throw mapLoanErrorToHttpException(error);
    }
  }

  @Delete(':loanId')
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthTokenPayload,
    @Param() params: LoanIdParamsDto,
  ) {
    try {
      await this.loanLifecyclePolicyService.deleteLoan(user.sub, params.loanId);

      return {
        deleted: true,
      };
    } catch (error) {
      throw mapLoanErrorToHttpException(error);
    }
  }
}

const mapLoanErrorToHttpException = (error: unknown): Error => {
  if (
    error instanceof CreateLoanNotFoundError ||
    error instanceof LifecycleLoanNotFoundError
  ) {
    return new NotFoundException({
      code: 'LOAN_NOT_FOUND',
      message: 'Loan not found',
    });
  }

  if (error instanceof CreateContactNotFoundError) {
    return new NotFoundException({
      code: 'CONTACT_NOT_FOUND',
      message: 'Contact not found',
    });
  }

  if (
    error instanceof CreateForbiddenLoanResourceError ||
    error instanceof LifecycleForbiddenLoanResourceError
  ) {
    return new ForbiddenException({
      code: 'FORBIDDEN_RESOURCE',
      message: 'Forbidden resource',
    });
  }

  if (error instanceof LoanHasPaymentsError) {
    return new UnprocessableEntityException({
      code: 'LOAN_HAS_PAYMENTS',
      message: error.message,
    });
  }

  return error instanceof Error ? error : new Error('Unexpected loan error');
};
