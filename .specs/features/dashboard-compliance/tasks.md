# Dashboard and Compliance Tasks

**Design**:

- `.specs/features/mvp-backend-architecture/design.md`
- `.specs/features/api-contracts/contracts.md`
- `.specs/features/data-model/mongodb.md`

**Status**: Draft

---

## Execution Plan

### Phase 1: Query and Export Foundations (Parallel OK)

```text
D1 -> D2 [P]
D1 -> D3 [P]
D1 -> D4 [P]
D1 -> D5 [P]
```

### Phase 2: HTTP Delivery (Sequential)

```text
D2 -> D6
D3 -> D6
D4 -> D6
D5 -> D6
```

---

## Task Breakdown

### D1: Create dashboard and compliance DTOs

**What**: Implement query DTOs and response contracts for dashboard, history, profile, export, and account deletion flows.
**Where**: `src/modules/dashboard/presentation/dto/`, `src/modules/users/presentation/dto/`
**Depends on**: Sprint 5 complete
**Reuses**: common pagination/filter DTO patterns
**Requirement**: `API-DASH-01`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] DTOs cover dashboard summary, history filters, export format, profile, and account deletion flows
- [ ] Validation matches the API contract spec
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### D2: Create dashboard summary query service [P]

**What**: Implement the service that computes dashboard summary metrics from loans and payments.
**Where**: `src/modules/dashboard/application/`
**Depends on**: D1, Sprint 5 complete
**Reuses**: indexed loan and payment reads
**Requirement**: `API-DASH-02`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Total outstanding, total overdue, total received, open count, and overdue count are returned correctly
- [ ] Summary logic uses persisted derived fields safely
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### D3: Create history projection service [P]

**What**: Implement the filtered history/list projection for dashboard history and loan summary views.
**Where**: `src/modules/dashboard/application/`
**Depends on**: D1, Sprint 5 complete
**Reuses**: loans repository, contacts projection, common filters
**Requirement**: `API-DASH-03`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] History projection supports status, contact, due-date, and period filters
- [ ] Canceled loans stay hidden by default and appear only through explicit filter
- [ ] Projection shape matches the contracts spec
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### D4: Create user export service [P]

**What**: Implement JSON and CSV export generation for user-owned data.
**Where**: `src/modules/users/application/`
**Depends on**: D1, Sprint 5 complete
**Reuses**: users, contacts, loans, installments, and payments repositories
**Requirement**: `API-USERS-01`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] JSON export includes users, contacts, loans, installments, and payments
- [ ] CSV export is generated for the same scope
- [ ] Export format validation is enforced
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### D5: Create profile and logical account deletion service [P]

**What**: Implement profile read and logical account deletion flows.
**Where**: `src/modules/users/application/`
**Depends on**: D1, Sprint 5 complete
**Reuses**: users repository and auth identity context
**Requirement**: `API-USERS-02`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Profile query returns the authenticated user projection
- [ ] Account deletion marks the user logically deleted without removing financial data
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### D6: Implement dashboard and users controllers with e2e flows

**What**: Wire dashboard summary/history, profile, export, and account deletion endpoints with e2e coverage.
**Where**: `src/modules/dashboard/presentation/`, `src/modules/users/presentation/`
**Depends on**: D1, D2, D3, D4, D5
**Reuses**: auth guard, API envelope, common error mapping
**Requirement**: `API-DASH-04`, `API-USERS-03`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /dashboard/summary`, `GET /dashboard/history`, `GET /users/me`, `GET /users/me/export`, and `DELETE /users/me` are exposed
- [ ] Export format handling works end-to-end
- [ ] Account deletion remains logical and does not erase historical domain data
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 6 new e2e tests pass with no regressions

**Tests**: e2e
**Gate**: full

---

## Parallel Execution Map

```text
Phase 1:
  D1

Phase 2:
  D1 complete, then:
    D2 [P]
    D3 [P]
    D4 [P]
    D5 [P]

Phase 3:
  D1, D2, D3, D4, D5 complete, then:
    D6
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| D1 | DTO and contract slice | OK |
| D2 | summary query slice | OK |
| D3 | history projection slice | OK |
| D4 | export service slice | OK |
| D5 | profile/deletion service slice | OK |
| D6 | controller and e2e slice | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| D1 | Sprint 5 complete | Foundation prerequisite only | OK |
| D2 | D1, Sprint 5 complete | D1 -> D2 | OK |
| D3 | D1, Sprint 5 complete | D1 -> D3 | OK |
| D4 | D1, Sprint 5 complete | D1 -> D4 | OK |
| D5 | D1, Sprint 5 complete | D1 -> D5 | OK |
| D6 | D1, D2, D3, D4, D5 | D1/D2/D3/D4/D5 -> D6 | OK |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| D1 | DTOs and validators | unit | unit | OK |
| D2 | Application services | unit | unit | OK |
| D3 | Application services | unit | unit | OK |
| D4 | Application services | unit | unit | OK |
| D5 | Application services | unit | unit | OK |
| D6 | Controllers and routes | e2e | e2e | OK |
