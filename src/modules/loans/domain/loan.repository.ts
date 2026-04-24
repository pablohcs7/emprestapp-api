import {
  CreateLoanRecord,
  Loan,
  LoanListFilters,
  LoanListResult,
  UpdateLoanDerivedStateRecord,
} from './loan.types';

export abstract class LoanRepository {
  abstract create(input: CreateLoanRecord): Promise<Loan>;
  abstract findById(loanId: string): Promise<Loan | null>;
  abstract findByIdForUser(loanId: string, userId: string): Promise<Loan | null>;
  abstract listForUser(userId: string, filters: LoanListFilters): Promise<LoanListResult>;
  abstract updateDerivedState(input: UpdateLoanDerivedStateRecord): Promise<Loan | null>;
  abstract linkContact(loanId: string, userId: string, contactId: string): Promise<Loan | null>;
  abstract cancel(loanId: string, userId: string, canceledAt: Date): Promise<Loan | null>;
  abstract delete(loanId: string, userId: string): Promise<boolean>;
}
