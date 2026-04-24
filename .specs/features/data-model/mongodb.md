# MongoDB Data Model

**Status:** Draft
**Inputs:**

- `.specs/features/domain-core/entities.md`
- `.specs/features/domain-core/lifecycle.md`
- `.specs/features/domain-core/calculations.md`
- `.specs/features/api-contracts/contracts.md`

---

## Purpose

Define the MongoDB persistence model for the MVP backend, including collections, stored fields, derived fields, indexes, and document-level constraints.

---

## Persistence Principles

- every protected document is scoped by `userId`
- money is stored as integer cents
- historical records are preserved instead of silently rewritten
- operational queries should be supported primarily through indexes, not only through application-side filtering
- status values that are read frequently and derived deterministically may still be persisted for query efficiency, but must always remain recalculable from source data

---

## Collection: `users`

### Purpose

Store user identity, authentication base data, and account lifecycle state.

### Document Shape

```json
{
  "_id": "ObjectId",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "passwordHash": "hashed-password",
  "status": "active",
  "createdAt": "2026-04-15T18:00:00.000Z",
  "updatedAt": "2026-04-15T18:00:00.000Z",
  "deletedAt": null
}
```

### Persisted Fields

- `fullName`
- `email`
- `passwordHash`
- `status`
- `createdAt`
- `updatedAt`
- `deletedAt?`

### Indexes

- unique index on `email`
- index on `status`

### Notes

- logical deletion sets `status=deleted` and `deletedAt`
- historical ownership references remain valid after deletion

---

## Collection: `refresh_sessions`

### Purpose

Store refresh token sessions per login.

### Document Shape

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tokenHash": "hashed-refresh-token",
  "expiresAt": "2026-04-16T18:00:00.000Z",
  "revokedAt": null,
  "createdAt": "2026-04-15T18:00:00.000Z"
}
```

### Persisted Fields

- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt?`
- `createdAt`

### Indexes

- index on `userId`
- unique index on `tokenHash`
- TTL index on `expiresAt`

### Notes

- TTL removes expired sessions automatically
- multiple active sessions per user are allowed

---

## Collection: `contacts`

### Purpose

Store user-owned contacts used for loan association.

### Document Shape

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "fullName": "John Smith",
  "documentId": "12345678900",
  "phone": "+5511999999999",
  "notes": "School friend",
  "status": "active",
  "createdAt": "2026-04-15T18:00:00.000Z",
  "updatedAt": "2026-04-15T18:00:00.000Z",
  "archivedAt": null
}
```

### Persisted Fields

- `userId`
- `fullName`
- `documentId?`
- `phone?`
- `notes?`
- `status`
- `createdAt`
- `updatedAt`
- `archivedAt?`

### Indexes

- compound index on `{ userId: 1, status: 1, fullName: 1 }`
- index on `{ userId: 1, documentId: 1 }`

### Notes

- no hard uniqueness required for `documentId` in MVP unless business requires it later
- archived contacts remain queryable for historical display

---

## Collection: `loans`

### Purpose

Store the main loan aggregate root and high-value query fields.

### Document Shape

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "contactId": "ObjectId",
  "principalAmountCents": 100000,
  "interestType": "compound",
  "interestRate": 2.5,
  "startDate": "2026-05-01T00:00:00.000Z",
  "dueDate": "2026-11-01T00:00:00.000Z",
  "installmentCount": 6,
  "status": "open",
  "currentBalanceCents": 106500,
  "totalPaidCents": 0,
  "createdAt": "2026-04-15T18:00:00.000Z",
  "updatedAt": "2026-04-15T18:00:00.000Z",
  "canceledAt": null
}
```

### Persisted Fields

- `userId`
- `contactId?`
- `principalAmountCents`
- `interestType`
- `interestRate?`
- `startDate`
- `dueDate`
- `installmentCount`
- `status`
- `currentBalanceCents`
- `totalPaidCents`
- `createdAt`
- `updatedAt`
- `canceledAt?`

### Derived but Persisted for Query Efficiency

- `status`
- `currentBalanceCents`
- `totalPaidCents`

### Source of Truth for Recalculation

- installments
- payments
- loan contract fields

### Indexes

- compound index on `{ userId: 1, status: 1, dueDate: 1 }`
- compound index on `{ userId: 1, contactId: 1, status: 1 }`
- compound index on `{ userId: 1, createdAt: -1 }`
- partial/filtered query behavior should support hiding `canceled` by default at application layer

### Notes

- physical delete allowed only when no payments exist
- updating financial contract fields after payments must be blocked at application layer

---

## Collection: `installments`

### Purpose

Store the repayment schedule and per-installment settlement state.

### Document Shape

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "loanId": "ObjectId",
  "sequence": 1,
  "dueDate": "2026-06-01T00:00:00.000Z",
  "expectedAmountCents": 17750,
  "paidAmountCents": 5000,
  "remainingAmountCents": 12750,
  "status": "pending",
  "createdAt": "2026-04-15T18:00:00.000Z",
  "updatedAt": "2026-08-01T13:00:00.000Z",
  "canceledAt": null
}
```

### Persisted Fields

- `userId`
- `loanId`
- `sequence`
- `dueDate`
- `expectedAmountCents`
- `paidAmountCents`
- `remainingAmountCents`
- `status`
- `createdAt`
- `updatedAt`
- `canceledAt?`

### Derived but Persisted for Query Efficiency

- `paidAmountCents`
- `remainingAmountCents`
- `status`

### Source of Truth for Recalculation

- active payments on the installment
- current system date
- cancellation state of parent loan

### Indexes

- unique compound index on `{ loanId: 1, sequence: 1 }`
- compound index on `{ userId: 1, loanId: 1, status: 1 }`
- compound index on `{ userId: 1, dueDate: 1, status: 1 }`

### Notes

- storing `userId` on installments avoids expensive join-like ownership checks through loans only
- `sequence` drives payment ordering

---

## Collection: `payments`

### Purpose

Store immutable payment history with logical cancellation.

### Document Shape

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "loanId": "ObjectId",
  "installmentId": "ObjectId",
  "amountCents": 5000,
  "paidAt": "2026-08-01T00:00:00.000Z",
  "method": "pix",
  "note": "Partial payment",
  "status": "active",
  "createdAt": "2026-08-01T13:00:00.000Z",
  "canceledAt": null
}
```

### Persisted Fields

- `userId`
- `loanId`
- `installmentId`
- `amountCents`
- `paidAt`
- `method?`
- `note?`
- `status`
- `createdAt`
- `canceledAt?`

### Indexes

- compound index on `{ userId: 1, loanId: 1, paidAt: -1 }`
- compound index on `{ userId: 1, installmentId: 1, status: 1 }`
- compound index on `{ userId: 1, status: 1, paidAt: -1 }`

### Notes

- payment documents are never physically deleted in normal operation
- canceled payments remain available for history and recalculation audit

---

## Collection Strategy for Dashboard

The MVP should not introduce a dedicated dashboard collection initially.

### Read Model Strategy

- derive dashboard metrics from indexed `loans` and `payments`
- derive history projection from indexed `loans`, optionally enriched with `contacts`

### When to Revisit

- if query performance degrades under real data volume
- if dashboard projections become materially more complex than the MVP summary

---

## Schema-Level Validation Rules

### Common

- timestamps on all collections
- `userId` required on all protected documents

### Loans

- `principalAmountCents > 0`
- `installmentCount >= 1`
- `interestType in [none, simple, compound]`
- `interestRate` required when `interestType != none`

### Installments

- `sequence >= 1`
- `expectedAmountCents > 0`
- `remainingAmountCents >= 0`
- `status in [pending, paid, overdue, canceled]`

### Payments

- `amountCents > 0`
- `status in [active, canceled]`
- `paidAt <= now` should still be enforced primarily at application/service layer

### Contacts

- `status in [active, archived]`

### Users

- `status in [active, deleted]`

---

## Recalculation Boundaries

The following updates should happen transactionally when supported by the implementation approach:

- creating a payment updates:
  - `payments`
  - target `installment`
  - parent `loan`
- canceling a payment updates:
  - `payments`
  - target `installment`
  - parent `loan`
- canceling a loan updates:
  - `loans`
  - all child `installments`

If full database transactions are not used in the first implementation, the application must still enforce ordered writes and recovery-safe recalculation.

---

## Open Technical Formalization Points

These are narrowed to implementation detail, not business ambiguity:

- exact Mongoose schema typing and enum declarations
- transaction strategy per write flow
- whether `interestRate` is stored as decimal percent or scaled integer
- exact CSV export generation structure
