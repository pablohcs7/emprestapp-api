# Loans Module Tasks

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

### Phase 1: Contracts and Persistence Foundations (Parallel OK)

```text
      -> L2 [P] ->
L1 ->              -> L5
      -> L3 [P] ->
      -> L4 [P] ->
```

### Phase 2: Application Services (Sequential)

```text
L5 -> L6 -> L7
```

---

## Task Breakdown

### L1: Create loan DTOs, enums, and response contracts

**What**: Implement DTOs and validation rules for loan creation, listing, detail, contact-linking, cancellation, and deletion.
**Where**: `src/modules/loans/presentation/dto/`
**Depends on**: Sprint 2 complete
**Reuses**: API contract spec, common pagination/filter DTO patterns
**Requirement**: `API-LOANS-01`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Loan DTOs cover create, list filter, detail projection, link-contact, cancel, and delete actions
- [ ] Validation enforces required contract fields and immutable rules where applicable
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L2: Create loan schema and repository adapter [P]

**What**: Implement the loans collection schema and repository adapter.
**Where**: `src/modules/loans/infrastructure/`
**Depends on**: L1
**Reuses**: `src/common/database/`
**Requirement**: `API-LOANS-02`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Loan schema matches the data model spec
- [ ] Repository supports create, find, list, update derived state, link contact, cancel, and delete
- [ ] Query indexes align with list and dashboard needs
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L3: Create installment schema and repository adapter [P]

**What**: Implement the installments collection schema and repository adapter.
**Where**: `src/modules/loans/infrastructure/`
**Depends on**: L1
**Reuses**: `src/common/database/`
**Requirement**: `API-LOANS-03`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Installment schema matches the data model spec
- [ ] Repository supports schedule insertion and installment state queries
- [ ] Sequence uniqueness is enforced
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L4: Create interest and installment schedule calculation services [P]

**What**: Implement pure domain services for simple interest, daily compound interest, installment generation, and derived balance/state recalculation.
**Where**: `src/modules/loans/domain/`
**Depends on**: L1
**Reuses**: domain calculation spec
**Requirement**: `API-LOANS-04`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Schedule generator creates monthly installments with last-installment remainder adjustment
- [ ] Simple and compound interest policies are implemented in cents
- [ ] Loan and installment derived-state helpers are deterministic
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 8 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L5: Create loan creation and linking services

**What**: Implement the use cases for creating loans, generating schedules, and linking contacts after creation.
**Where**: `src/modules/loans/application/`
**Depends on**: L2, L3, L4, Sprint 3 contacts available
**Reuses**: contacts ownership checks, calculation services
**Requirement**: `API-LOANS-05`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Loan creation persists the loan plus generated installments consistently
- [ ] Loans can be created with or without contact
- [ ] Link-contact flow works in any loan state
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 6 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L6: Create loan read and lifecycle policy services

**What**: Implement list/detail reads plus cancel/delete policy enforcement.
**Where**: `src/modules/loans/application/`
**Depends on**: L2, L3, L4, L5
**Reuses**: persisted derived state, contacts data, common filters
**Requirement**: `API-LOANS-06`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Loan list and detail projections match the contracts spec
- [ ] Default list hides canceled loans
- [ ] Cancel and delete policies enforce no-payments rule
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 6 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### L7: Implement loans controller and e2e flows

**What**: Wire the loans HTTP routes and cover the module with e2e tests.
**Where**: `src/modules/loans/presentation/`
**Depends on**: L1, L5, L6
**Reuses**: auth guard, API envelope, error mapping
**Requirement**: `API-LOANS-07`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Create, list, detail, link-contact, cancel, and delete routes are exposed
- [ ] Derived schedule and balance data are returned correctly
- [ ] Forbidden ownership access returns `403`
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 7 new e2e tests pass with no regressions

**Tests**: e2e
**Gate**: full

---

## Parallel Execution Map

```text
Phase 1:
  L1

Phase 2:
  L1 complete, then:
    L2 [P]
    L3 [P]
    L4 [P]

Phase 3:
  L2, L3, L4 complete, and Sprint 3 available, then:
    L5 -> L6 -> L7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| L1 | DTO and contract slice | OK |
| L2 | loan persistence slice | OK |
| L3 | installment persistence slice | OK |
| L4 | calculation domain slice | OK |
| L5 | create/link application slice | OK |
| L6 | read/lifecycle application slice | OK |
| L7 | controller and e2e slice | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| L1 | Sprint 2 complete | Foundation prerequisite only | OK |
| L2 | L1 | L1 -> L2 | OK |
| L3 | L1 | L1 -> L3 | OK |
| L4 | L1 | L1 -> L4 | OK |
| L5 | L2, L3, L4, Sprint 3 contacts available | L2/L3/L4 -> L5 | OK |
| L6 | L2, L3, L4, L5 | L5 -> L6 | OK |
| L7 | L1, L5, L6 | L1/L5/L6 -> L7 | OK |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| L1 | DTOs and validators | unit | unit | OK |
| L2 | Repository adapters | unit | unit | OK |
| L3 | Repository adapters | unit | unit | OK |
| L4 | Pure domain functions | unit | unit | OK |
| L5 | Application services | unit | unit | OK |
| L6 | Application services | unit | unit | OK |
| L7 | Controllers and routes | e2e | e2e | OK |
