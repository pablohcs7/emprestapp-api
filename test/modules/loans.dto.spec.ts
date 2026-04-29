import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  LoanDetailView,
  LoanListItemView,
  LoanListView,
} from '../../src/modules/loans/presentation/loans.types';
import { CreateLoanDto } from '../../src/modules/loans/presentation/dto/create-loan.dto';
import { LinkLoanContactDto } from '../../src/modules/loans/presentation/dto/link-loan-contact.dto';
import { ListLoansQueryDto } from '../../src/modules/loans/presentation/dto/list-loans-query.dto';
import { LoanIdParamsDto } from '../../src/modules/loans/presentation/dto/loan-id-params.dto';

describe('loans dto and contracts', () => {
  const validContactId = '507f1f77bcf86cd799439011';
  const validLoanId = '507f1f77bcf86cd799439012';

  it('validates a create-loan payload with compound interest and installments', async () => {
    const dto = plainToInstance(CreateLoanDto, {
      contactId: validContactId,
      principalAmountCents: 100000,
      interestType: 'compound',
      interestRate: 2.5,
      startDate: '2026-05-01T00:00:00.000Z',
      installmentPlan: {
        count: 6,
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.principalAmountCents).toBe(100000);
    expect(dto.interestRate).toBe(2.5);
    expect(dto.installmentPlan?.count).toBe(6);
  });

  it('requires interestRate when interestType is simple or compound', async () => {
    const dto = plainToInstance(CreateLoanDto, {
      principalAmountCents: 100000,
      interestType: 'simple',
      startDate: '2026-05-01T00:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      interestRateRequiredForInterestType:
        'interestRate is required when interestType is simple or compound',
    });
  });

  it('rejects interestRate when interestType is none', async () => {
    const dto = plainToInstance(CreateLoanDto, {
      principalAmountCents: 100000,
      interestType: 'none',
      interestRate: 1.5,
      startDate: '2026-05-01T00:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      interestRateRequiredForInterestType:
        'interestRate must not be provided when interestType is none',
    });
  });

  it('validates list-loan filters from query params', async () => {
    const dto = plainToInstance(ListLoansQueryDto, {
      status: 'open, overdue ,paid',
      contactId: ` ${validContactId} `,
      dueDateFrom: '2026-05-01T00:00:00.000Z',
      dueDateTo: '2026-11-01T00:00:00.000Z',
      periodFrom: '2026-01-01T00:00:00.000Z',
      periodTo: '2026-12-31T00:00:00.000Z',
      page: '2',
      pageSize: '15',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.status).toEqual(['open', 'overdue', 'paid']);
    expect(dto.contactId).toBe(validContactId);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(15);
  });

  it('defines controller-facing loan response contracts', () => {
    const item: LoanListItemView = {
      id: 'loan_1',
      contactId: 'ctc_1',
      principalAmountCents: 100000,
      interestType: 'compound',
      interestRate: 2.5,
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      dueDate: new Date('2026-11-01T00:00:00.000Z'),
      installmentCount: 6,
      status: 'open',
      currentBalanceCents: 106500,
      totalPaidCents: 0,
      createdAt: new Date('2026-04-24T00:00:00.000Z'),
      updatedAt: new Date('2026-04-24T00:00:00.000Z'),
      canceledAt: null,
    };
    const detail: LoanDetailView = {
      ...item,
      installments: [
        {
          id: 'inst_1',
          sequence: 1,
          dueDate: new Date('2026-06-01T00:00:00.000Z'),
          expectedAmountCents: 17750,
          paidAmountCents: 0,
          remainingAmountCents: 17750,
          status: 'pending',
        },
      ],
      paymentSummary: {
        totalPaidCents: 0,
        currentBalanceCents: 106500,
      },
    };
    const list: LoanListView = {
      items: [item],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    const params = plainToInstance(LoanIdParamsDto, { loanId: validLoanId });
    const linkContact = plainToInstance(LinkLoanContactDto, {
      contactId: validContactId,
    });

    expect(detail.installments).toHaveLength(1);
    expect(detail.paymentSummary.currentBalanceCents).toBe(106500);
    expect(list.items).toHaveLength(1);
    expect(params.loanId).toBe(validLoanId);
    expect(linkContact.contactId).toBe(validContactId);
  });
});
