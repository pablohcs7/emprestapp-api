import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  DashboardHistoryItemView,
  DashboardHistoryListView,
  DashboardSummaryView,
} from '../../src/modules/dashboard/presentation/dashboard.types';
import { ListDashboardHistoryQueryDto } from '../../src/modules/dashboard/presentation/dto/list-dashboard-history-query.dto';
import { ExportUserDataQueryDto } from '../../src/modules/users/presentation/dto/export-user-data-query.dto';
import {
  UserAccountDeletionView,
  UserExportJsonView,
  UserProfileView,
} from '../../src/modules/users/presentation/users.types';

describe('dashboard and compliance dto and contracts', () => {
  it('validates dashboard history filters from query params', async () => {
    const dto = plainToInstance(ListDashboardHistoryQueryDto, {
      status: 'open, overdue ,paid',
      contactId: ' ctc_123 ',
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
    expect(dto.contactId).toBe('ctc_123');
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(15);
  });

  it('rejects invalid dashboard history status filters', async () => {
    const dto = plainToInstance(ListDashboardHistoryQueryDto, {
      status: 'open,invalid',
      page: '1',
      pageSize: '20',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toMatchObject({
      isIn: 'each value in status must be one of the following values: open, paid, overdue, canceled',
    });
  });

  it('normalizes and validates export format', async () => {
    const dto = plainToInstance(ExportUserDataQueryDto, {
      format: ' CSV ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.format).toBe('csv');
  });

  it('uses json as the default export format', async () => {
    const dto = plainToInstance(ExportUserDataQueryDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.format).toBe('json');
  });

  it('defines controller-facing dashboard and user contracts', () => {
    const summary: DashboardSummaryView = {
      totalOutstandingCents: 106500,
      totalOverdueCents: 17750,
      totalReceivedCents: 5000,
      openLoansCount: 3,
      overdueLoansCount: 1,
    };
    const historyItem: DashboardHistoryItemView = {
      id: 'loan_1',
      contactId: 'ctc_1',
      contactName: 'John Smith',
      principalAmountCents: 100000,
      currentBalanceCents: 101500,
      totalPaidCents: 5000,
      dueDate: new Date('2026-11-01T00:00:00.000Z'),
      status: 'open',
      createdAt: new Date('2026-04-24T00:00:00.000Z'),
      updatedAt: new Date('2026-04-24T00:00:00.000Z'),
      canceledAt: null,
    };
    const history: DashboardHistoryListView = {
      items: [historyItem],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    const profile: UserProfileView = {
      id: 'usr_1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      status: 'active',
      createdAt: new Date('2026-04-15T18:00:00.000Z'),
    };
    const deletion: UserAccountDeletionView = {
      status: 'deleted',
    };
    const exportJson: UserExportJsonView = {
      user: {
        ...profile,
        updatedAt: new Date('2026-04-24T00:00:00.000Z'),
        deletedAt: null,
      },
      contacts: [{ id: 'ctc_1' }],
      loans: [{ id: 'loan_1' }],
      installments: [{ id: 'inst_1' }],
      payments: [{ id: 'pay_1' }],
    };

    expect(summary.totalOutstandingCents).toBe(106500);
    expect(history.items).toHaveLength(1);
    expect(profile.email).toBe('jane@example.com');
    expect(deletion.status).toBe('deleted');
    expect(exportJson.payments).toHaveLength(1);
  });
});
