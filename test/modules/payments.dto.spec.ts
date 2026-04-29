import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  PaymentListItemView,
  PaymentListView,
  PaymentView,
} from '../../src/modules/payments/presentation/payments.types';
import { CreatePaymentDto } from '../../src/modules/payments/presentation/dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../../src/modules/payments/presentation/dto/list-payments-query.dto';
import { PaymentIdParamsDto } from '../../src/modules/payments/presentation/dto/payment-id-params.dto';

describe('payments dto and contracts', () => {
  const validLoanId = '507f1f77bcf86cd799439012';
  const validInstallmentId = '507f1f77bcf86cd799439013';
  const validPaymentId = '507f1f77bcf86cd799439014';

  it('validates and normalizes the create-payment payload', async () => {
    const dto = plainToInstance(CreatePaymentDto, {
      loanId: validLoanId,
      installmentId: validInstallmentId,
      amountCents: '5000',
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      method: ' pix ',
      note: ' Partial payment ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.amountCents).toBe(5000);
    expect(dto.method).toBe('pix');
    expect(dto.note).toBe('Partial payment');
  });

  it('rejects future paidAt values', async () => {
    const dto = plainToInstance(CreatePaymentDto, {
      loanId: validLoanId,
      installmentId: validInstallmentId,
      amountCents: 5000,
      paidAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      isTodayOrPastDate: 'paidAt must be today or in the past',
    });
  });

  it('rejects non-positive payment amounts', async () => {
    const dto = plainToInstance(CreatePaymentDto, {
      loanId: validLoanId,
      installmentId: validInstallmentId,
      amountCents: 0,
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      min: 'amountCents must not be less than 1',
    });
  });

  it('validates list-payment filters and parses status values', async () => {
    const dto = plainToInstance(ListPaymentsQueryDto, {
      loanId: ` ${validLoanId} `,
      installmentId: ` ${validInstallmentId} `,
      status: 'active, canceled',
      paidAtFrom: '2026-01-01T00:00:00.000Z',
      paidAtTo: '2026-12-31T00:00:00.000Z',
      page: '2',
      pageSize: '15',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.loanId).toBe(validLoanId);
    expect(dto.installmentId).toBe(validInstallmentId);
    expect(dto.status).toEqual(['active', 'canceled']);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(15);
  });

  it('defines controller-facing payment response contracts', () => {
    const item: PaymentListItemView = {
      id: 'pay_1',
      loanId: 'loan_123',
      installmentId: 'inst_003',
      amountCents: 5000,
      paidAt: new Date('2026-08-01T00:00:00.000Z'),
      method: 'pix',
      note: 'Partial payment',
      status: 'active',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      canceledAt: null,
    };
    const detail: PaymentView = item;
    const list: PaymentListView = {
      items: [item],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    const params = plainToInstance(PaymentIdParamsDto, { paymentId: validPaymentId });

    expect(detail.id).toBe('pay_1');
    expect(list.items).toHaveLength(1);
    expect(params.paymentId).toBe(validPaymentId);
  });
});
