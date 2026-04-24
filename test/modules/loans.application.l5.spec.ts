import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import { Contact } from '../../src/modules/contacts/domain/contact.types';
import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { Installment } from '../../src/modules/loans/domain/installment.types';
import { LoanCalculationService } from '../../src/modules/loans/domain/loan-calculation.service';
import {
  LoanInstallmentScheduleItem,
  LoanStateSnapshot,
} from '../../src/modules/loans/domain/loan-calculation.types';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan, LoanStatus } from '../../src/modules/loans/domain/loan.types';
import {
  ContactNotFoundError,
  ForbiddenLoanResourceError,
  LoansApplicationService,
} from '../../src/modules/loans/application/loans.application.service';

describe('loans application service L5', () => {
  it('creates a loan without a contact and persists calculation output', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const contactRepository = createContactRepositoryMock();
    const calculationService = createCalculationServiceMock({
      contractualTotalCents: 106500,
      installments: [
        {
          sequence: 1,
          dueDate: new Date('2026-06-01T00:00:00.000Z'),
          expectedAmountCents: 35500,
        },
        {
          sequence: 2,
          dueDate: new Date('2026-07-01T00:00:00.000Z'),
          expectedAmountCents: 35500,
        },
        {
          sequence: 3,
          dueDate: new Date('2026-08-01T00:00:00.000Z'),
          expectedAmountCents: 35500,
        },
      ],
      loanState: {
        status: 'open',
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        installments: [
          {
            sequence: 1,
            dueDate: new Date('2026-06-01T00:00:00.000Z'),
            expectedAmountCents: 35500,
            paidAmountCents: 0,
            remainingAmountCents: 35500,
            status: 'pending',
          },
          {
            sequence: 2,
            dueDate: new Date('2026-07-01T00:00:00.000Z'),
            expectedAmountCents: 35500,
            paidAmountCents: 0,
            remainingAmountCents: 35500,
            status: 'pending',
          },
          {
            sequence: 3,
            dueDate: new Date('2026-08-01T00:00:00.000Z'),
            expectedAmountCents: 35500,
            paidAmountCents: 0,
            remainingAmountCents: 35500,
            status: 'pending',
          },
        ],
        totalPaidCents: 0,
        currentBalanceCents: 106500,
      },
    });

    loanRepository.create.mockResolvedValue(
      buildLoan({
        id: 'loan_1',
        userId: 'usr_1',
        contactId: null,
        principalAmountCents: 100000,
        interestType: 'compound',
        interestRate: 2.5,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        installmentCount: 3,
        currentBalanceCents: 106500,
        totalPaidCents: 0,
      }),
    );
    installmentRepository.createMany.mockResolvedValue([
      buildInstallment({
        id: 'inst_1',
        loanId: 'loan_1',
        sequence: 1,
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
        paidAmountCents: 0,
        remainingAmountCents: 35500,
        status: 'pending',
      }),
      buildInstallment({
        id: 'inst_2',
        loanId: 'loan_1',
        sequence: 2,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
        paidAmountCents: 0,
        remainingAmountCents: 35500,
        status: 'pending',
      }),
      buildInstallment({
        id: 'inst_3',
        loanId: 'loan_1',
        sequence: 3,
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
        paidAmountCents: 0,
        remainingAmountCents: 35500,
        status: 'pending',
      }),
    ]);

    const service = new LoansApplicationService(
      loanRepository,
      installmentRepository,
      contactRepository,
      calculationService,
    );

    const result = await service.create('usr_1', {
      principalAmountCents: 100000,
      interestType: 'compound',
      interestRate: 2.5,
      startDate: '2026-05-01',
      installmentPlan: {
        count: 3,
      },
    });

    expect(contactRepository.findByIdForUser).not.toHaveBeenCalled();
    expect(contactRepository.findById).not.toHaveBeenCalled();
    expect(calculationService.generateMonthlyInstallments).toHaveBeenCalledWith(
      expect.objectContaining({
        principalAmountCents: 100000,
        interestType: 'compound',
        interestRate: 2.5,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        installmentCount: 3,
      }),
    );
    expect(loanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        principalAmountCents: 100000,
        interestType: 'compound',
        interestRate: 2.5,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        installmentCount: 3,
        currentBalanceCents: 106500,
        totalPaidCents: 0,
      }),
    );
    expect(loanRepository.create.mock.calls[0]?.[0].contactId ?? null).toBeNull();
    expect(installmentRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'usr_1',
        loanId: 'loan_1',
        sequence: 1,
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
      }),
      expect.objectContaining({
        userId: 'usr_1',
        loanId: 'loan_1',
        sequence: 2,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
      }),
      expect.objectContaining({
        userId: 'usr_1',
        loanId: 'loan_1',
        sequence: 3,
        dueDate: new Date('2026-08-01T00:00:00.000Z'),
        expectedAmountCents: 35500,
      }),
    ]);
    expect(result).toMatchObject({
      id: 'loan_1',
      contactId: null,
      currentBalanceCents: 106500,
      totalPaidCents: 0,
    });
  });

  it('creates a loan with an owned contact', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const contactRepository = createContactRepositoryMock();
    const calculationService = createCalculationServiceMock({
      contractualTotalCents: 51000,
      installments: [
        {
          sequence: 1,
          dueDate: new Date('2026-06-15T00:00:00.000Z'),
          expectedAmountCents: 25500,
        },
        {
          sequence: 2,
          dueDate: new Date('2026-07-15T00:00:00.000Z'),
          expectedAmountCents: 25500,
        },
      ],
      loanState: {
        status: 'open',
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        installments: [
          {
            sequence: 1,
            dueDate: new Date('2026-06-15T00:00:00.000Z'),
            expectedAmountCents: 25500,
            paidAmountCents: 0,
            remainingAmountCents: 25500,
            status: 'pending',
          },
          {
            sequence: 2,
            dueDate: new Date('2026-07-15T00:00:00.000Z'),
            expectedAmountCents: 25500,
            paidAmountCents: 0,
            remainingAmountCents: 25500,
            status: 'pending',
          },
        ],
        totalPaidCents: 0,
        currentBalanceCents: 51000,
      },
    });

    contactRepository.findByIdForUser.mockResolvedValue(
      buildContact({
        id: 'ctc_1',
        userId: 'usr_1',
      }),
    );
    loanRepository.create.mockResolvedValue(
      buildLoan({
        id: 'loan_1',
        userId: 'usr_1',
        contactId: 'ctc_1',
        principalAmountCents: 50000,
        interestType: 'simple',
        interestRate: 2,
        startDate: new Date('2026-05-15T00:00:00.000Z'),
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        installmentCount: 2,
        currentBalanceCents: 51000,
        totalPaidCents: 0,
      }),
    );
    installmentRepository.createMany.mockResolvedValue([
      buildInstallment({
        id: 'inst_1',
        loanId: 'loan_1',
        sequence: 1,
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
        expectedAmountCents: 25500,
      }),
      buildInstallment({
        id: 'inst_2',
        loanId: 'loan_1',
        sequence: 2,
        dueDate: new Date('2026-07-15T00:00:00.000Z'),
        expectedAmountCents: 25500,
      }),
    ]);

    const service = new LoansApplicationService(
      loanRepository,
      installmentRepository,
      contactRepository,
      calculationService,
    );

    await service.create('usr_1', {
      contactId: 'ctc_1',
      principalAmountCents: 50000,
      interestType: 'simple',
      interestRate: 2,
      startDate: '2026-05-15',
      installmentPlan: {
        count: 2,
      },
    });

    expect(contactRepository.findByIdForUser).toHaveBeenCalledWith(
      'ctc_1',
      'usr_1',
    );
    expect(loanRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        contactId: 'ctc_1',
      }),
    );
    expect(installmentRepository.createMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      label: 'when the contact is missing',
      findByIdResultFactory: () => null,
      expectedError: ContactNotFoundError,
      expectedCode: 'CONTACT_NOT_FOUND',
    },
    {
      label: 'when the contact is owned by another user',
      findByIdResultFactory: () => buildContact({
        id: 'ctc_1',
        userId: 'usr_other',
      }),
      expectedError: ForbiddenLoanResourceError,
      expectedCode: 'FORBIDDEN_RESOURCE',
    },
  ])('rejects create %s', async ({ findByIdResultFactory, expectedError, expectedCode }) => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const contactRepository = createContactRepositoryMock();
    const calculationService = createCalculationServiceMock();

    contactRepository.findByIdForUser.mockResolvedValue(null);
    contactRepository.findById.mockResolvedValue(findByIdResultFactory());

    const service = new LoansApplicationService(
      loanRepository,
      installmentRepository,
      contactRepository,
      calculationService,
    );

    const createAttempt = service.create('usr_1', {
      contactId: 'ctc_1',
      principalAmountCents: 50000,
      interestType: 'compound',
      interestRate: 2,
      startDate: '2026-05-15',
      installmentPlan: {
        count: 2,
      },
    });

    await expect(createAttempt).rejects.toBeInstanceOf(expectedError);
    await expect(createAttempt).rejects.toMatchObject({ code: expectedCode });
    expect(loanRepository.create).not.toHaveBeenCalled();
    expect(installmentRepository.createMany).not.toHaveBeenCalled();
  });

  it.each([
    'open',
    'paid',
    'overdue',
    'canceled',
  ] as LoanStatus[])(
    'links a contact to an existing loan in %s state',
    async (status) => {
      const loanRepository = createLoanRepositoryMock();
      const installmentRepository = createInstallmentRepositoryMock();
      const contactRepository = createContactRepositoryMock();
      const calculationService = createCalculationServiceMock();

      loanRepository.findByIdForUser.mockResolvedValue(
        buildLoan({
          id: 'loan_1',
          userId: 'usr_1',
          status,
          contactId: null,
        }),
      );
      loanRepository.linkContact.mockResolvedValue(
        buildLoan({
          id: 'loan_1',
          userId: 'usr_1',
          status,
          contactId: 'ctc_2',
        }),
      );
      contactRepository.findByIdForUser.mockResolvedValue(
        buildContact({
          id: 'ctc_2',
          userId: 'usr_1',
        }),
      );

      const service = new LoansApplicationService(
        loanRepository,
        installmentRepository,
        contactRepository,
        calculationService,
      );

      const result = await service.linkContact('usr_1', 'loan_1', {
        contactId: 'ctc_2',
      });

      expect(loanRepository.findByIdForUser).toHaveBeenCalledWith(
        'loan_1',
        'usr_1',
      );
      expect(contactRepository.findByIdForUser).toHaveBeenCalledWith(
        'ctc_2',
        'usr_1',
      );
      expect(loanRepository.linkContact).toHaveBeenCalledWith(
        'loan_1',
        'usr_1',
        'ctc_2',
      );
      expect(result).toMatchObject({
        id: 'loan_1',
        status,
        contactId: 'ctc_2',
      });
    },
  );

  it.each([
    {
      label: 'when the loan is missing',
      findByIdResultFactory: () => null,
      expectedCode: 'LOAN_NOT_FOUND',
    },
    {
      label: 'when the loan belongs to another user',
      findByIdResultFactory: () => buildLoan({
        id: 'loan_1',
        userId: 'usr_other',
      }),
      expectedCode: 'FORBIDDEN_RESOURCE',
    },
  ])('rejects link-contact %s', async ({ findByIdResultFactory, expectedCode }) => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const contactRepository = createContactRepositoryMock();
    const calculationService = createCalculationServiceMock();

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(findByIdResultFactory());

    const service = new LoansApplicationService(
      loanRepository,
      installmentRepository,
      contactRepository,
      calculationService,
    );

    const linkAttempt = service.linkContact('usr_1', 'loan_1', {
      contactId: 'ctc_2',
    });

    await expect(linkAttempt).rejects.toMatchObject({ code: expectedCode });
    expect(loanRepository.linkContact).not.toHaveBeenCalled();
    expect(contactRepository.findByIdForUser).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'when the target contact is missing',
      findByIdResultFactory: () => null,
      expectedError: ContactNotFoundError,
      expectedCode: 'CONTACT_NOT_FOUND',
    },
    {
      label: 'when the target contact belongs to another user',
      findByIdResultFactory: () => buildContact({
        id: 'ctc_2',
        userId: 'usr_other',
      }),
      expectedError: ForbiddenLoanResourceError,
      expectedCode: 'FORBIDDEN_RESOURCE',
    },
  ])('rejects link-contact %s', async ({ findByIdResultFactory, expectedError, expectedCode }) => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const contactRepository = createContactRepositoryMock();
    const calculationService = createCalculationServiceMock();

    loanRepository.findByIdForUser.mockResolvedValue(
      buildLoan({
        id: 'loan_1',
        userId: 'usr_1',
        status: 'canceled',
      }),
    );
    contactRepository.findByIdForUser.mockResolvedValue(null);
    contactRepository.findById.mockResolvedValue(findByIdResultFactory());

    const service = new LoansApplicationService(
      loanRepository,
      installmentRepository,
      contactRepository,
      calculationService,
    );

    const linkAttempt = service.linkContact('usr_1', 'loan_1', {
      contactId: 'ctc_2',
    });

    await expect(linkAttempt).rejects.toBeInstanceOf(expectedError);
    await expect(linkAttempt).rejects.toMatchObject({ code: expectedCode });
    expect(loanRepository.linkContact).not.toHaveBeenCalled();
  });
});

const createLoanRepositoryMock = () =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    updateDerivedState: jest.fn(),
    linkContact: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<LoanRepository>;

const createInstallmentRepositoryMock = () =>
  ({
    createMany: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    findByLoanId: jest.fn(),
    findByLoanIdAndStatus: jest.fn(),
    findByLoanIdAndSequence: jest.fn(),
    findNextOpenForLoan: jest.fn(),
  }) as unknown as jest.Mocked<InstallmentRepository>;

const createContactRepositoryMock = () =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    reactivate: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<ContactRepository>;

const createCalculationServiceMock = (overrides: {
  contractualTotalCents?: number;
  installments?: LoanInstallmentScheduleItem[];
  loanState?: LoanStateSnapshot;
} = {}) => {
  const service = {
    calculateContractualTotalCents: jest
      .fn()
      .mockReturnValue(overrides.contractualTotalCents ?? 51000),
    generateMonthlyInstallments: jest
      .fn()
      .mockReturnValue(
        overrides.installments ?? [
          {
            sequence: 1,
            dueDate: new Date('2026-06-15T00:00:00.000Z'),
            expectedAmountCents: 51000,
          },
        ],
      ),
    recalculateLoanState: jest.fn().mockReturnValue(
      overrides.loanState ?? {
        status: 'open',
        dueDate: new Date('2026-06-15T00:00:00.000Z'),
        installments: [
          {
            sequence: 1,
            dueDate: new Date('2026-06-15T00:00:00.000Z'),
            expectedAmountCents: 51000,
            paidAmountCents: 0,
            remainingAmountCents: 51000,
            status: 'pending',
          },
        ],
        totalPaidCents: 0,
        currentBalanceCents: 51000,
      },
    ),
  };

  return service as unknown as jest.Mocked<LoanCalculationService>;
};

const buildLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan_1',
  userId: 'usr_1',
  contactId: null,
  principalAmountCents: 50000,
  interestType: 'compound',
  interestRate: 2.5,
  startDate: new Date('2026-05-15T00:00:00.000Z'),
  dueDate: new Date('2026-07-15T00:00:00.000Z'),
  installmentCount: 2,
  status: 'open',
  currentBalanceCents: 51000,
  totalPaidCents: 0,
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const buildInstallment = (
  overrides: Partial<Installment> = {},
): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-06-15T00:00:00.000Z'),
  expectedAmountCents: 25500,
  paidAmountCents: 0,
  remainingAmountCents: 25500,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const buildContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'ctc_1',
  userId: 'usr_1',
  fullName: 'John Smith',
  documentId: '12345678900',
  phone: '+5511999999999',
  notes: 'School friend',
  status: 'active',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});
