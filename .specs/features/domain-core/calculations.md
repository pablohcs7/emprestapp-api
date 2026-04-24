# Financial Calculation Rules

**Status:** Draft
**Inputs:**

- `.specs/features/domain-core/entities.md`
- `.specs/features/domain-core/lifecycle.md`
- `.specs/features/glossary-assumptions/assumptions.md`

---

## Purpose

Define the deterministic financial rules required to compute loan totals, installment schedules, outstanding balances, and status transitions using integer cents.

---

## Monetary Precision

- all internal amounts are stored in integer cents
- all formulas must resolve to integer cents before persistence
- schedule remainder caused by division is applied only to the last installment
- no floating-point values are persisted as monetary truth

---

## Time Basis

- day counting uses calendar days
- overdue and accrual logic use the current system date only
- installment schedule frequency is monthly only in the MVP

---

## Loan Total Construction

### Step 1: Determine base principal

- `principalAmountCents` is the original loan amount

### Step 2: Determine interest model

- `none`: no interest is added
- `simple`: accrual is based on the original principal during the whole period
- `compound`: accrual is capitalized daily

### Step 3: Determine contracted total for schedule generation

The installment schedule is generated from the total contractual amount of the loan, including interest.

### Rule

- for installment-based loans, expected installment values already include the contracted interest effect
- for non-installment loans, the single implicit installment includes the full contractual amount

---

## Simple Interest Rule

### Policy

- simple interest is calculated over the original principal during the whole period
- principal does not change the interest base

### Formalization Target

Later API/data specs must define the exact rate representation and formula input units, but the policy is fixed:

- base = original principal
- accrual basis = calendar days
- no compounding

---

## Compound Interest Rule

### Policy

- compound interest is capitalized daily
- capitalization uses calendar days
- the contracted rate remains the same before and after due date

### Formalization Target

Later API/data specs must define the exact daily conversion from the stored rate and the exact rounding boundary per accrual period.

---

## Installment Schedule Generation

### Inputs

- `principalAmountCents`
- `interestType`
- `interestRate` when applicable
- `startDate`
- `installmentCount`

### Generation Rules

- installment count must match the user input exactly
- the first installment due date is one month after `startDate`
- each next installment uses the same day-of-month as `startDate`
- the final loan `dueDate` equals the last installment due date
- the contractual total is divided across installments in cents
- any cent remainder is applied only to the last installment

---

## Payment Application

### Rules

- every payment targets exactly one installment
- payments must be made in sequence against the next open installment
- an installment may receive multiple payments
- payment can be smaller than the installment expected amount
- installment becomes `paid` only when the sum of active payments for that installment reaches the installment expected amount
- until full settlement, installment remains `pending` or `overdue`

### Invalid Cases

- paying a non-sequential installment
- payment date in the future
- payment larger than the remaining amount due on the targeted installment or loan

---

## Balance Derivation

### Installment Remaining Amount

For each installment:

- `remaining = expectedAmountCents - sum(active payment amounts for installment)`
- lower bound is zero

### Loan Outstanding Balance

For the loan:

- `outstandingBalance = sum(remaining amounts of all non-canceled installments)`

### Total Paid

- `totalPaid = sum(active payment amounts across all installments of the loan)`

---

## Effects of Payment Cancellation

- canceled payment is removed from active payment sums
- the linked installment is recalculated immediately
- if fully reopened before due date, installment becomes `pending`
- if fully reopened after due date, installment becomes `overdue`
- other installments keep their due dates and expected amounts unchanged
- the loan status is recalculated from the installment states

---

## Loan Completion Rule

- a loan is `paid` only when every installment is `paid`
- partial payment across installments never marks the loan as `paid`

---

## Canceled Loan Rule

- canceling a loan is allowed only when it has no payments
- canceling a loan sets every installment to `canceled`
- canceled loans are excluded from default loan listing unless explicitly filtered

---

## Formalization Still Needed

These are not open policy questions anymore, but they still require exact technical formalization in the next artifacts:

- exact mathematical formula for `simple` interest in cents
- exact mathematical formula for daily `compound` capitalization in cents
- exact representation of `interestRate` in API payloads and persistence
- exact rounding checkpoints during accrual and schedule generation
