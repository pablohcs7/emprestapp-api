# Domain Lifecycle and State Transitions

**Status:** Draft
**Inputs:**

- `.specs/features/domain-core/entities.md`
- `.specs/features/glossary-assumptions/assumptions.md`

---

## Purpose

Define how loans, installments, contacts, payments, and user accounts change state over time in the MVP backend.

---

## Loan Lifecycle

### States

- `open`
- `paid`
- `overdue`
- `canceled`

### Derivation Rules

- loan is `paid` when all installments are `paid`
- loan is `canceled` when it was explicitly canceled under allowed rules
- loan is `overdue` when at least one active installment is overdue and the loan is not fully paid
- otherwise the loan is `open`

### Allowed Transitions

| From | To | Trigger |
| --- | --- | --- |
| `open` | `paid` | all installments become `paid` |
| `open` | `overdue` | current system date passes due date of next unpaid installment |
| `open` | `canceled` | explicit cancel action with zero payments |
| `overdue` | `paid` | all installments become `paid` |
| `overdue` | `open` | cancellation of a payment removes overdue condition and next unpaid installment is not yet due |
| `paid` | `open` | payment cancellation reopens a future-due installment |
| `paid` | `overdue` | payment cancellation reopens a past-due installment |

### Forbidden Transitions

- `canceled` to any other state
- any transition caused by direct manual status editing
- cancellation when the loan has payments

---

## Installment Lifecycle

### States

- `pending`
- `paid`
- `overdue`
- `canceled`

### Derivation Rules

- installment is `paid` when active payments on that installment sum to its `expectedAmountCents`
- installment is `overdue` when current system date is after its due date and it is not `paid`
- installment is `canceled` when the parent loan is canceled
- otherwise installment is `pending`

### Allowed Transitions

| From | To | Trigger |
| --- | --- | --- |
| `pending` | `paid` | total active payments reaches expected amount |
| `pending` | `overdue` | current system date passes due date before full payment |
| `pending` | `canceled` | parent loan canceled |
| `overdue` | `paid` | total active payments reaches expected amount |
| `overdue` | `pending` | payment cancellation removes overdue condition before due date |
| `paid` | `pending` | payment cancellation reopens installment before due date |
| `paid` | `overdue` | payment cancellation reopens installment after due date |

### Forbidden Transitions

- direct move to `paid` without matching amount
- any `partial` status
- paying installments out of sequence

---

## Payment Lifecycle

### States

- `active`
- `canceled`

### Allowed Transitions

| From | To | Trigger |
| --- | --- | --- |
| `active` | `canceled` | explicit cancellation action |

### Forbidden Transitions

- `canceled` to `active`
- arbitrary edit of amount, installment, or date after creation
- physical deletion as part of normal operation

### Effects of Cancellation

- original payment stays in history
- linked installment is recalculated
- linked loan is recalculated
- later installments are not reorganized or shifted

---

## Contact Lifecycle

### States

- `active`
- `archived`

### Allowed Transitions

| From | To | Trigger |
| --- | --- | --- |
| `active` | `archived` | archive action when linked loans are only `paid` or `canceled` |
| `archived` | `active` | reactivation action |

### Forbidden Operations

- archive when contact has any active loan
- delete when contact has any linked loan other than none

### Deletion Rule

- physical deletion is allowed only when the contact has no linked loans

---

## User Lifecycle

### States

- `active`
- `deleted`

### Allowed Transitions

| From | To | Trigger |
| --- | --- | --- |
| `active` | `deleted` | account deletion request |

### Effects of Deletion

- user account is logically deleted
- financial records remain preserved
- ownership boundaries remain valid for retained records

---

## Refresh Session Lifecycle

### States

- `active`
- `expired`
- `revoked`

### Rules

- every login creates a new active session
- old sessions remain active until TTL expiration or revocation
- expired sessions are not reusable

---

## System-Time Rule

All state transitions that depend on time use only the current system date and time. The MVP does not accept an external reference date for status simulation or recalculation.
