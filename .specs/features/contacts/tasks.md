# Contacts Module Tasks

**Design**:

- `.specs/features/mvp-backend-architecture/design.md`
- `.specs/features/api-contracts/contracts.md`
- `.specs/features/data-model/mongodb.md`

**Status**: Draft

---

## Execution Plan

### Phase 1: Contracts and Persistence (Sequential)

```text
C1 -> C2
```

### Phase 2: Application Services (Parallel OK)

```text
      -> C3 [P] ->
C2 ->              -> C5
      -> C4 [P] ->
```

---

## Task Breakdown

### C1: Create contact DTOs and response contracts

**What**: Implement request/response DTOs and validation rules for contacts endpoints.
**Where**: `src/modules/contacts/presentation/dto/`
**Depends on**: Sprint 2 complete
**Reuses**: `src/common/http/`, `src/common/dto/`
**Requirement**: `API-CONTACTS-01`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] DTOs exist for create, update, list filter, archive, reactivate, and delete flows
- [ ] Validation matches the contracts spec
- [ ] Response shapes are standardized for controller use
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### C2: Create contact schema and repository adapter

**What**: Implement the Mongo schema and repository adapter for contacts.
**Where**: `src/modules/contacts/infrastructure/`
**Depends on**: C1
**Reuses**: `src/common/database/`
**Requirement**: `API-CONTACTS-02`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Contact schema matches the data model spec
- [ ] Repository exposes create, find, update, archive, reactivate, and delete operations
- [ ] Index declarations align with the Mongo model
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### C3: Create contact create-update-list service [P]

**What**: Implement contact application services for create, update, list, and detail retrieval.
**Where**: `src/modules/contacts/application/`
**Depends on**: C2
**Reuses**: contacts repository, shared pagination/filter patterns
**Requirement**: `API-CONTACTS-03`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Create, update, list, and detail use cases are implemented
- [ ] Ownership filtering is enforced in service layer
- [ ] Query filters match the contracts spec
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### C4: Create archive-reactivate-delete policy service [P]

**What**: Implement contact lifecycle policy checks for archive, reactivate, and physical delete flows.
**Where**: `src/modules/contacts/application/`
**Depends on**: C2, Sprint 4 loan reads available
**Reuses**: contacts repository, loans read access
**Requirement**: `API-CONTACTS-04`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Active-loan archive/delete blocking is enforced
- [ ] Archived contacts can be reactivated
- [ ] Physical delete is allowed only for contacts with no loan history
- [ ] Error codes follow the contracts spec
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

---

### C5: Implement contacts controller and e2e flows

**What**: Wire contacts HTTP routes and cover them with e2e tests.
**Where**: `src/modules/contacts/presentation/`
**Depends on**: C1, C3, C4
**Reuses**: auth guard, API envelope, common error mapping
**Requirement**: `API-CONTACTS-05`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /contacts`, `GET /contacts`, `GET /contacts/:id`, `PATCH /contacts/:id`, archive, reactivate, and delete routes are exposed
- [ ] Ownership violations return `403`
- [ ] Business-rule failures return documented error codes
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 6 new e2e tests pass with no regressions

**Tests**: e2e
**Gate**: full

---

## Parallel Execution Map

```text
Phase 1:
  C1 -> C2

Phase 2:
  C2 complete, then:
    C3 [P]
    C4 [P]

Phase 3:
  C1, C3, C4 complete, then:
    C5
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| C1 | DTO and validation slice | OK |
| C2 | schema and repository slice | OK |
| C3 | create/update/list service slice | OK |
| C4 | archive/reactivate/delete policy slice | OK |
| C5 | controller and e2e slice | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| C1 | Sprint 2 complete | Foundation prerequisite only | OK |
| C2 | C1 | C1 -> C2 | OK |
| C3 | C2 | C2 -> C3 | OK |
| C4 | C2, Sprint 4 loan reads available | C2 -> C4 | OK |
| C5 | C1, C3, C4 | C1/C3/C4 -> C5 | OK |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| C1 | DTOs and validators | unit | unit | OK |
| C2 | Repository adapters | unit | unit | OK |
| C3 | Application services | unit | unit | OK |
| C4 | Application services | unit | unit | OK |
| C5 | Controllers and routes | e2e | e2e | OK |
