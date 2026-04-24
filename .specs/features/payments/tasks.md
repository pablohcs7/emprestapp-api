# Payments Module Tasks

**Design**:

- `.specs/features/mvp-backend-architecture/design.md`
- `.specs/features/domain-core/entities.md`
- `.specs/features/domain-core/lifecycle.md`
- `.specs/features/domain-core/calculations.md`
- `.specs/features/api-contracts/contracts.md`
- `.specs/features/data-model/mongodb.md`

**Status**: Draft

---

## Execution Plan

### Phase 1: Contracts and Persistence (Sequential)

```text
P1 -> P2
```

### Phase 2: Application Services (Parallel OK)

```text
      -> P3 [P] ->
P2 ->              -> P5 -> P6
      -> P4 [P] ->
```

---

## Task Breakdown

### P1: Create payment DTOs and response contracts

**What**: Implement DTOs and validation rules for payment registration, listing, and cancellation.
**Where**: `src/modules/payments/presentation/dto/`
**Depends on**: Sprint 4 complete
**Reuses**: payment contracts, common filter DTO patterns
**Requirement**: `API-PAYMENTS-01`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] DTOs exist for create, list filters, and cancel actions
- [ ] Validation enforces `paidAt`, amount, and installment targeting rules
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### P2: Create payment schema and repository adapter

**What**: Implement the payments collection schema and repository adapter.
**Where**: `src/modules/payments/infrastructure/`
**Depends on**: P1
**Reuses**: `src/common/database/`
**Requirement**: `API-PAYMENTS-02`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Payment schema matches the data model spec
- [ ] Repository supports register, history list, and cancel operations
- [ ] Indexed payment history queries are available
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### P3: Create installment settlement and balance recalculation service [P]

**What**: Implement domain/application services that recalculate installment and loan state after payment writes.
**Where**: `src/modules/payments/application/`, `src/modules/loans/domain/`
**Depends on**: P2, Sprint 4 complete
**Reuses**: installment repositories, loan derived-state helpers
**Requirement**: `API-PAYMENTS-03`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Installment paid amount, remaining amount, and status are recalculated correctly
- [ ] Parent loan total paid, balance, and status are recalculated correctly
- [ ] Cancellation reopen logic follows lifecycle rules
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 7 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### P4: Create payment register and cancellation services [P]

**What**: Implement payment creation and payment cancellation use cases with sequential installment enforcement.
**Where**: `src/modules/payments/application/`
**Depends on**: P2, Sprint 4 complete
**Reuses**: loan and installment repositories, recalculation helpers
**Requirement**: `API-PAYMENTS-04`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Payment creation rejects invalid sequence and invalid amount
- [ ] Partial payment is allowed without partial status
- [ ] Cancellation preserves history and triggers recalculation
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 7 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### P5: Create payment history query service

**What**: Implement payment list and loan-specific history queries.
**Where**: `src/modules/payments/application/`
**Depends on**: P2, P3, P4
**Reuses**: indexed payment queries and API filters
**Requirement**: `API-PAYMENTS-05`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Global payment list supports documented filters
- [ ] Loan-specific history includes canceled payments
- [ ] Ownership enforcement is preserved through all query paths
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### P6: Implement payments controller and e2e flows

**What**: Wire payment registration, history, and cancellation routes with e2e coverage.
**Where**: `src/modules/payments/presentation/`
**Depends on**: P1, P3, P4, P5
**Reuses**: auth guard, API envelope, loans/installments state
**Requirement**: `API-PAYMENTS-06`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /payments`, `GET /payments`, `GET /loans/:loanId/payments`, and `POST /payments/:paymentId/cancel` routes are exposed
- [ ] Sequential-payment and overpayment rules are enforced end-to-end
- [ ] Cancellation visibly reopens installment/loan state when applicable
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 7 new e2e tests pass with no regressions

**Tests**: e2e
**Gate**: full

---

## Parallel Execution Map

```text
Phase 1:
  P1 -> P2

Phase 2:
  P2 complete, then:
    P3 [P]
    P4 [P]

Phase 3:
  P2, P3, P4 complete, then:
    P5 -> P6
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| P1 | DTO and validation slice | OK |
| P2 | payment persistence slice | OK |
| P3 | recalculation slice | OK |
| P4 | register/cancel service slice | OK |
| P5 | history query slice | OK |
| P6 | controller and e2e slice | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| P1 | Sprint 4 complete | Foundation prerequisite only | OK |
| P2 | P1 | P1 -> P2 | OK |
| P3 | P2, Sprint 4 complete | P2 -> P3 | OK |
| P4 | P2, Sprint 4 complete | P2 -> P4 | OK |
| P5 | P2, P3, P4 | P2/P3/P4 -> P5 | OK |
| P6 | P1, P3, P4, P5 | P1/P3/P4/P5 -> P6 | OK |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| P1 | DTOs and validators | unit | unit | OK |
| P2 | Repository adapters | unit | unit | OK |
| P3 | Domain and application services | unit | unit | OK |
| P4 | Application services | unit | unit | OK |
| P5 | Application services | unit | unit | OK |
| P6 | Controllers and routes | e2e | e2e | OK |
