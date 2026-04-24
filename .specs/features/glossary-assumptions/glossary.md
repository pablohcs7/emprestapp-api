# EmprestApp Glossary

**Feature**: `.specs/features/glossary-assumptions/spec.md`
**Status**: Draft
**Purpose**: Canonical vocabulary for backend, domain specs, contracts, and implementation

---

## Core Actors

### User

The owner of the system account. A user authenticates, manages contacts, creates loans, records payments, and sees dashboard/history data only for their own resources.

### Contact

A person related to the user's lending activity. A contact may be linked to one or more loans, but a loan may also exist without a contact. The canonical technical term is `contact`.

**Avoid using as canonical term**: `client`

---

## Core Financial Objects

### Loan

The aggregate that represents money lent by a user. A loan contains principal, interest settings, lifecycle dates, optional installment schedule data, derived status, and payment history linkage.

### Payment

A recorded amount applied against a loan's total outstanding balance. In the MVP, payments reduce only the total loan balance and do not allocate directly to principal, interest, or specific installments.

### Installment Plan

The scheduling structure attached to a loan when the user chooses to organize repayment into installments. In the MVP, installments generate planned dates, planned values, and installment statuses, but the loan balance remains global to the loan.

### Refresh Session

The persisted representation of an authenticated refresh-token lifecycle for a user session.

---

## Financial Terms

### Principal Amount

The original amount lent before applying any accrued interest.

### Interest Type

The contracted interest mode of the loan. Supported values in the MVP are:

- `none`
- `simple`
- `compound`

### Interest Rate

The contracted rate used for loan calculations when interest type is `simple` or `compound`. If an interest-bearing loan is created without a rate, the API must reject it.

### Outstanding Balance

The total amount still owed for a loan at the current system date. This is the canonical balance concept used by payments and status derivation.

### Due Date

The contractual deadline of the loan. If the due date passes and the outstanding balance remains above zero, the loan becomes `overdue`.

### Start Date

The date from which the loan's contractual timeline and interest behavior begin.

---

## Loan Status Terms

### Open

The loan status used while there is still an outstanding balance and the loan is not yet overdue.

### Paid

The loan status used once the outstanding balance reaches zero, regardless of whether payment happens before or after the due date.

### Overdue

The loan status used when the current system date is after the due date and the loan still has outstanding balance.

### Canceled

The loan status used when a loan is canceled according to business rules. In the MVP, cancellation is only allowed if the loan has no payments.

---

## Installment Status Terms

### Pending

The installment has not yet been fulfilled and is not yet overdue.

### Paid

The installment is considered fulfilled according to the generated schedule view.

### Overdue

The installment planned date has passed and the schedule still shows it as unpaid.

### Canceled

The installment schedule entry is no longer active because the underlying loan was canceled or the schedule was invalidated by an allowed business event.

---

## History and Integrity Terms

### Canceled Payment

A payment record that remains in history but is marked as canceled. In the MVP, canceled payments are not physically deleted and may cause the loan to reopen.

### Historical Integrity

The principle that loan and payment records should preserve the operational history of what happened rather than silently rewriting the past.

### Resource Ownership

The rule that every protected resource belongs to exactly one user. Access to another user's protected resource returns `403`.

---

## API and Validation Terms

### Validation Error

A request rejection caused by invalid input shape or invalid field values, such as future `paidAt`, missing `interestRate` for an interest-bearing loan, or overpayment amount.

### Domain Error

A request rejection caused by a business-rule violation, such as trying to archive a contact with an active loan or canceling a loan that already has payments.

### API Error Code

The stable internal identifier returned by the API for a failure, such as `CONTACT_HAS_ACTIVE_LOAN`.

### Friendly Error Message

The human-readable error text returned alongside the internal error code so clients can display understandable feedback.
