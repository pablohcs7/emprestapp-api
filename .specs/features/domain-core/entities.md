# Domain Core Entities

**Status:** Draft
**Inputs:**

- `.specs/features/glossary-assumptions/glossary.md`
- `.specs/features/glossary-assumptions/assumptions.md`

---

## Purpose

Define the core backend domain entities, their responsibilities, ownership boundaries, and invariants for the MVP API.

---

## Entity: User

### Description

Represents the authenticated owner of all protected resources in the system.

### Fields

- `id`
- `fullName`
- `email`
- `passwordHash`
- `status`: `active | deleted`
- `createdAt`
- `updatedAt`

### Invariants

- `email` must be unique among active accounts
- `passwordHash` is never exposed through API responses
- user-owned resources are always isolated by `userId`
- account deletion is logical, not physical

### Relationships

- owns many `contacts`
- owns many `loans`
- owns many `payments`
- owns many `refreshSessions`

---

## Entity: Contact

### Description

Represents a person related to the user's lending activity.

### Fields

- `id`
- `userId`
- `fullName`
- `documentId?`
- `phone?`
- `notes?`
- `status`: `active | archived`
- `createdAt`
- `updatedAt`

### Invariants

- a contact always belongs to exactly one user
- a contact may exist without linked loans
- a contact with active loans cannot be archived or deleted
- a contact linked only to `paid` or `canceled` loans may be archived
- a contact with no linked loans may be physically deleted
- an archived contact may be reactivated

### Relationships

- belongs to one `user`
- may be linked to many `loans`

---

## Entity: Loan

### Description

Represents money lent by a user, with contracted financial rules, schedule structure, status derivation, and payment history.

### Fields

- `id`
- `userId`
- `contactId?`
- `principalAmountCents`
- `interestType`: `none | simple | compound`
- `interestRate?`
- `startDate`
- `dueDate`
- `installmentCount`
- `status`: `open | paid | overdue | canceled`
- `createdAt`
- `updatedAt`
- `canceledAt?`

### Invariants

- `principalAmountCents` must be greater than zero
- if `interestType` is `simple` or `compound`, `interestRate` is required
- `dueDate` must equal the due date of the last installment
- `installmentCount` generates exactly that number of installments
- a loan may be created without `contactId`
- a contact may be linked later in any loan state
- once a payment exists, the loan cannot be edited
- interest type and interest rate are immutable after creation
- a loan may be canceled only if it has no payments
- a loan may be physically deleted only if it has no payments
- a canceled loan must not accept new payments

### Relationships

- belongs to one `user`
- may belong to one `contact`
- owns many `installments`
- owns many `payments`

---

## Entity: Installment

### Description

Represents the scheduled repayment unit of a loan. In the MVP, installments are part of the real state machine of the loan, not just a visual projection.

### Fields

- `id`
- `loanId`
- `sequence`
- `dueDate`
- `expectedAmountCents`
- `status`: `pending | paid | overdue | canceled`
- `createdAt`
- `updatedAt`

### Invariants

- each loan has at least one installment
- a non-parceled loan is modeled as one implicit installment
- installments are monthly in the MVP
- the first installment is due one month after `startDate`
- all following installments fall on the same day-of-month as `startDate`
- installment values are generated in cents with any remainder applied only to the last installment
- payments must target a specific installment
- installment payment must be sequential: only the next open installment may receive payment
- an installment may receive multiple payments
- an installment becomes `paid` only when the sum of active payments reaches its expected amount
- a partially paid installment remains `pending` or `overdue`, never `partial`
- canceling a loan sets all its installments to `canceled`

### Relationships

- belongs to one `loan`
- receives many `payments`

---

## Entity: Payment

### Description

Represents a recorded payment made toward a specific installment of a loan.

### Fields

- `id`
- `userId`
- `loanId`
- `installmentId`
- `amountCents`
- `paidAt`
- `method?`
- `note?`
- `status`: `active | canceled`
- `createdAt`
- `canceledAt?`

### Invariants

- `paidAt` may only be today or in the past
- `amountCents` must be greater than zero
- a payment must belong to the same user as the loan and installment
- payment cannot target an installment out of sequence
- overpayment is invalid
- payment records are not freely editable
- payment cancellation marks the original record as `canceled`
- payment cancellation never physically deletes history

### Relationships

- belongs to one `user`
- belongs to one `loan`
- belongs to one `installment`

---

## Entity: RefreshSession

### Description

Represents a persisted refresh-token session for authentication lifecycle management.

### Fields

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt?`
- `createdAt`

### Invariants

- new login creates a new refresh session
- existing sessions remain active until expiration or revocation
- refresh sessions expire automatically through TTL behavior

### Relationships

- belongs to one `user`

---

## Cross-Entity Invariants

- every protected resource is user-owned
- cross-user access always returns `403`
- money is stored internally in integer cents
- canceled payments remain visible in history
- canceled loans are hidden from default loan lists and appear only through explicit status filters
