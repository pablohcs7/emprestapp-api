# EmprestApp Assumptions and Confirmed Rules

**Feature**: `.specs/features/glossary-assumptions/spec.md`
**Status**: Draft
**Purpose**: Record confirmed rules, provisional assumptions, and remaining open points for Sprint 0

---

## Scope Boundary

This artifact applies to the backend MVP only. It supports later domain, API contract, and data-model specs.

In scope for these decisions:

- auth and protected resource ownership
- loans and payments domain behavior
- installment scheduling behavior for the MVP
- list filters, dashboard minimums, and error semantics

Explicitly out of scope here:

- frontend UX
- notification/collection automation
- banking integrations
- credit scoring

---

## Confirmed Rules

### ASSUMP-001: Payment targets a specific installment and reduces the loan through installment settlement

**Status:** Confirmed
**Rule:** Every payment targets a specific installment and contributes to settling that installment's expected amount.
**Implication:** Loan balance is derived from installment remaining amounts, not from an unrelated global payment bucket.

### ASSUMP-002: MVP supports `none`, `simple`, and `compound` interest

**Status:** Confirmed
**Rule:** Loans may use no interest, simple interest, or compound interest.
**Implication:** Domain and API contracts must support all three values.

### ASSUMP-003: Interest continues after due date using the contracted rate

**Status:** Confirmed
**Rule:** Interest may continue accruing after the due date and uses the same contracted rate and interest type.
**Implication:** There is no separate late-fee rate in the MVP.

### ASSUMP-004: Installments are part of the real loan state in the MVP

**Status:** Confirmed
**Rule:** Installments generate planned dates, planned values, statuses, and actual settlement progression for the loan.
**Implication:** A loan is considered paid only when every installment is fully settled.

### ASSUMP-005: Overpayment is invalid

**Status:** Confirmed
**Rule:** A payment greater than the outstanding balance must be rejected.
**Implication:** API contracts need a validation or domain error for invalid amount.

### ASSUMP-006: Unauthorized resource access returns `403`

**Status:** Confirmed
**Rule:** Accessing another user's protected contact, loan, or payment returns `403`.
**Implication:** Resource hiding through `404` is not used for ownership violations in the MVP.

### ASSUMP-007: Loan status derivation is installment and date based

**Status:** Confirmed
**Rule:** Loan statuses are:

- `open` while at least one installment is still unpaid and no active installment is overdue
- `paid` when all installments are paid
- `overdue` when at least one installment is overdue and the loan is not fully paid
- `canceled` when cancellation occurs under allowed rules

### ASSUMP-008: Loans become non-editable after payment exists

**Status:** Confirmed
**Rule:** Once a loan has a recorded payment, the loan cannot be edited.
**Implication:** Financial fields and non-financial fields are both locked after first payment.

### ASSUMP-009: Payments are not freely editable

**Status:** Confirmed
**Rule:** A payment cannot be edited or deleted freely after creation.
**Implication:** The MVP supports cancellation/history preservation instead of silent mutation.

### ASSUMP-010: Loan status and accrual use the current system date only

**Status:** Confirmed
**Rule:** The API uses only the current system date to determine overdue state and accrual timing.
**Implication:** There is no external reference date override in the MVP.

### ASSUMP-011: Loan creation fields are minimally defined

**Status:** Confirmed
**Rule:** The minimum loan creation fields are:

- `principalAmount`
- `interestType`
- `interestRate` when interest exists
- `startDate`
- `dueDate`
- `contactId` optional
- `installmentPlan` optional

### ASSUMP-012: Interest-bearing loans require a rate

**Status:** Confirmed
**Rule:** If `interestType` is `simple` or `compound`, `interestRate` is mandatory.
**Implication:** Missing rate is a validation error.

### ASSUMP-013: Loans may exist without a contact

**Status:** Confirmed
**Rule:** A loan may be created without `contactId`.
**Implication:** The system must support linking a contact later.

### ASSUMP-014: Contact can be linked later in any loan state

**Status:** Confirmed
**Rule:** A loan created without `contactId` may later be linked to an existing contact in any state.

### ASSUMP-015: Canceled payments preserve the original record

**Status:** Confirmed
**Rule:** Payment cancellation marks the original payment as canceled instead of creating an automatic reversal record.
**Implication:** If a replacement payment is needed, it becomes a new payment record.

### ASSUMP-016: Contacts with active loans cannot be archived or deleted

**Status:** Confirmed
**Rule:** A contact linked to an active loan cannot be archived or deleted.
**Implication:** The API must return an error such as `CONTACT_HAS_ACTIVE_LOAN` plus a friendly message.

### ASSUMP-017: Fully paid loans become `paid` immediately

**Status:** Confirmed
**Rule:** If all installments become fully settled before the last due date, the loan immediately becomes `paid`.

### ASSUMP-018: Reopening happens automatically after payment cancellation

**Status:** Confirmed
**Rule:** If canceling a payment causes the balance to become positive again, the loan automatically returns to `open` or `overdue` according to the current system date.

### ASSUMP-019: Installment statuses are fixed for the MVP

**Status:** Confirmed
**Rule:** Installment statuses are:

- `pending`
- `paid`
- `overdue`
- `canceled`

### ASSUMP-020: Partial payments are allowed on the targeted installment without partial status

**Status:** Confirmed
**Rule:** A payment may be smaller than the expected amount of its targeted installment, but the installment remains `pending` or `overdue` until fully settled.

### ASSUMP-021: Interest type and rate are immutable

**Status:** Confirmed
**Rule:** After loan creation, interest type and interest rate can never be changed.

### ASSUMP-022: API errors return code plus friendly message

**Status:** Confirmed
**Rule:** Business-rule and validation failures must expose a stable internal code and a user-friendly message.

### ASSUMP-023: Payment fields are minimally defined

**Status:** Confirmed
**Rule:** Required payment fields are:

- `loanId`
- `installmentId`
- `amount`
- `paidAt`

Optional fields are:

- `method`
- `note`

### ASSUMP-024: Payment date cannot be future dated

**Status:** Confirmed
**Rule:** `paidAt` may only be today or in the past.

### ASSUMP-025: Money is stored internally in cents

**Status:** Confirmed
**Rule:** Monetary values use integer cents internally.
**Implication:** API contract and persistence specs must define conversion boundaries clearly.

### ASSUMP-026: Loan deletion and cancellation are distinct

**Status:** Confirmed
**Rule:** A loan may be canceled, but physical deletion is allowed only if the loan has no payments.

### ASSUMP-027: Loan cancellation is restricted

**Status:** Confirmed
**Rule:** A loan may be canceled only if it has no payments.

### ASSUMP-028: Dashboard minimum metrics are defined

**Status:** Confirmed
**Rule:** The MVP dashboard includes at least:

- total amount outstanding
- total overdue amount
- total amount received
- count of open loans
- count of overdue loans

### ASSUMP-029: Loan history minimum fields are defined

**Status:** Confirmed
**Rule:** Loan list/history items must show at least:

- contact
- principal amount
- current balance
- status
- due date
- total paid

### ASSUMP-030: Loan list minimum filters are defined

**Status:** Confirmed
**Rule:** The MVP loan list supports filters by:

- status
- contact
- due date
- period

### ASSUMP-031: Data export supports JSON and CSV

**Status:** Confirmed
**Rule:** LGPD-style export in the MVP must support both JSON and CSV outputs.

---

## Remaining Open Points

At this stage, the core blocker topics raised during planning are resolved. The remaining work is mostly specification synthesis rather than unresolved business-policy discovery.

Topics still to formalize in later specs:

- exact formulas for simple and compound accrual in cents
- exact installment-generation algorithm and rounding strategy
- exact API payload and error object shapes
- exact Mongo indexes and document structure

---

## Deferred Ideas

- Reminder and collection automation after MVP stabilization
- Reporting/analytics expansion for recurring lenders
- Frontend and mobile spec streams after backend contract stabilization
