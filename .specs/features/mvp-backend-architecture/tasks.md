# MVP Backend Architecture Tasks

**Design**: `.specs/features/mvp-backend-architecture/design.md`
**Status**: Draft

---

## Scope of This Backlog

This backlog covers only the executable, unblocked foundation work for the backend:

- workspace bootstrap
- common infrastructure
- auth foundation
- user/auth persistence foundations

It does not yet include detailed `loans`, `payments`, or `dashboard` implementation tasks because the financial-rule specs are still unresolved.

**Traceability basis**:

- `AD-004` - modular monolith backend structure
- `AD-005` - unit plus e2e testing baseline
- `FOUND-10` to `FOUND-12` - naming and traceability conventions

---

## Execution Plan

### Phase 1: Workspace Foundation (Sequential)

```text
T1
```

### Phase 2: Shared Building Blocks (Parallel OK)

```text
      -> T3 [P] ->
T1 -> -> T4 [P] ->
      -> T5 [P] ->
```

### Phase 3: Auth and Persistence Foundations (Mixed)

```text
T3 -> T2
T4 -> T2
T5 -> T2

T5 -> T6 [P] -> T7 [P] -> T8 [P]
T3 --------------------^
```

### Phase 4: Auth HTTP Flow (Sequential)

```text
T2 -> T9
T4 -> T9
T6 -> T9
T7 -> T9
T8 -> T9
```

---

## Task Breakdown

### T1: Initialize the NestJS workspace baseline

**What**: Create the project toolchain baseline with package scripts, TypeScript strict configuration, Nest CLI configuration, and test directory conventions.
**Where**: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `test/`
**Depends on**: None
**Reuses**: Standard NestJS workspace layout
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The workspace defines build, unit test, and e2e test scripts
- [ ] TypeScript `strict` mode is enabled
- [ ] Nest CLI and test directory structure are configured for the project
- [ ] Gate check passes: `npm run build`

**Tests**: none
**Gate**: build

**Verify**:

- Run `npm run build`
- Confirm the workspace compiles with no missing baseline configuration files

**Commit**: `chore(workspace): initialize nest baseline`

---

### T2: Create the application bootstrap and root module wiring

**What**: Implement `main.ts` and `app.module.ts` with global validation, configuration loading, and top-level module composition.
**Where**: `src/main.ts`, `src/app.module.ts`
**Depends on**: T1, T3, T4, T5
**Reuses**: Nest bootstrap pattern, common config and HTTP layers from T3-T5
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The Nest app boots with global validation enabled
- [ ] Root module composes common infrastructure and feature modules cleanly
- [ ] An e2e smoke test proves the app starts successfully
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 1 new e2e startup test passes with no regressions

**Tests**: e2e
**Gate**: full

**Verify**:

- Run `npm run test:e2e -- --runInBand`
- Confirm the app boots and the e2e smoke spec passes

**Commit**: `feat(app): add bootstrap and root module wiring`

---

### T3: Create the configuration module and environment schema [P]

**What**: Add centralized configuration loading and environment validation for runtime settings used by the app and auth flows.
**Where**: `src/config/`
**Depends on**: T1
**Reuses**: Nest config module conventions
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Configuration values are loaded from a single module boundary
- [ ] Missing or invalid required environment values fail fast
- [ ] Unit tests cover valid and invalid configuration scenarios
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 3 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm config parsing and validation tests pass for both valid and invalid inputs

**Commit**: `feat(config): add runtime config module`

---

### T4: Create the standard API envelope and global error mapping [P]

**What**: Implement the shared `{ success, data, error }` response envelope and global exception mapping utilities.
**Where**: `src/common/http/`, `src/common/errors/`
**Depends on**: T1
**Reuses**: Project-wide response and error conventions from `PROJECT.md`
**Requirement**: `AD-004`, `FOUND-10`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Controllers can return the standard response envelope through shared utilities
- [ ] Global error mapping converts common failures into the standard envelope shape
- [ ] Unit tests cover success mapping and representative error cases
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm the shared response and error mapping tests pass

**Commit**: `feat(common): add api envelope and error mapping`

---

### T5: Create Mongo connection helpers and shared database base abstractions [P]

**What**: Implement shared database configuration helpers, base schema fields, and reusable persistence conventions for Mongoose adapters.
**Where**: `src/common/database/`
**Depends on**: T1
**Reuses**: Planned base schema and ownership conventions from the design doc
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Shared database helpers expose connection and base schema conventions cleanly
- [ ] Reusable timestamp and ownership field patterns are centralized
- [ ] Unit tests cover schema helper behavior and configuration assembly
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 3 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm the common database helper tests pass

**Commit**: `feat(database): add shared mongoose foundation`

---

### T6: Create user and refresh-session persistence foundations [P]

**What**: Define the user and refresh-session repository ports plus the initial Mongoose schema skeletons needed by auth flows.
**Where**: `src/modules/users/`, `src/modules/auth/infrastructure/`
**Depends on**: T5
**Reuses**: Common database abstractions from T5
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] User and refresh-session persistence contracts are defined behind module-owned interfaces
- [ ] Initial Mongoose schemas exist for users and refresh sessions
- [ ] Unit tests cover schema defaults and repository contract expectations
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm schema and persistence-foundation tests pass

**Commit**: `feat(auth): add user and session persistence foundation`

---

### T7: Create auth token and password services [P]

**What**: Implement the core auth services responsible for password hashing, password verification, JWT issuing, and refresh token hashing.
**Where**: `src/modules/auth/`
**Depends on**: T3, T6
**Reuses**: Config module from T3 and persistence contracts from T6
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Password hashing and verification are isolated in dedicated auth services
- [ ] Access-token and refresh-token issuing logic is centralized
- [ ] Unit tests cover success paths and invalid token configuration scenarios
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 5 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm token and password service tests pass

**Commit**: `feat(auth): add token and password services`

---

### T8: Create the auth guard and current-user access helpers [P]

**What**: Implement the authentication guard and current-user decorator/helper used by protected routes.
**Where**: `src/modules/auth/`
**Depends on**: T7
**Reuses**: Auth token services from T7
**Requirement**: `AD-004`, `FOUND-10`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Protected routes can resolve authenticated user identity through shared helpers
- [ ] Invalid or missing tokens are rejected consistently
- [ ] Unit tests cover successful resolution and rejection scenarios
- [ ] Gate check passes: `npm run test -- --runInBand`
- [ ] Test count: at least 4 new unit tests pass with no regressions

**Tests**: unit
**Gate**: quick

**Verify**:

- Run `npm run test -- --runInBand`
- Confirm auth guard and current-user helper tests pass

**Commit**: `feat(auth): add guard and current user helpers`

---

### T9: Implement the auth HTTP flow for register, login, and refresh

**What**: Wire the auth module end-to-end with DTOs, controller, application service, repository adapter usage, and e2e coverage for register, login, and refresh flows.
**Where**: `src/modules/auth/`
**Depends on**: T2, T4, T6, T7, T8
**Reuses**: App bootstrap from T2, API envelope from T4, persistence and auth services from T6-T8
**Requirement**: `AD-004`, `AD-005`

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Register, login, and refresh endpoints are exposed through the auth controller
- [ ] DTO validation and standard response envelope are applied consistently
- [ ] Repository-backed auth flows persist and rotate refresh-session state correctly
- [ ] E2E tests cover register, login, refresh, and invalid credential scenarios
- [ ] Gate check passes: `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build`
- [ ] Test count: at least 4 new e2e tests pass with no regressions

**Tests**: e2e
**Gate**: full

**Verify**:

- Run `npm run test:e2e -- --runInBand`
- Confirm register, login, refresh, and invalid-credential flows pass end-to-end

**Commit**: `feat(auth): implement register login and refresh flows`

---

## Parallel Execution Map

```text
Phase 1:
  T1

Phase 2:
  T1 complete, then:
    T3 [P]
    T4 [P]
    T5 [P]

Phase 3:
  T3, T4, T5 complete, then:
    T2
  T5 complete, then:
    T6 [P] -> T7 [P] -> T8 [P]

Phase 4:
  T2, T4, T6, T7, T8 complete, then:
    T9
```

**Multi-agent candidates**:

- T3, T4, and T5 can run concurrently in separate agents
- T6, T7, and T8 are unit-test tasks and can each be delegated to a separate agent when their dependencies are satisfied
- T2 and T9 are not parallel-safe because they require e2e verification and shared app wiring

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Initialize workspace baseline | project bootstrap config set | OK |
| T2: Create bootstrap and root module | app wiring and startup only | OK |
| T3: Create config module | 1 shared infrastructure concern | OK |
| T4: Create API envelope and error mapping | 1 shared HTTP concern | OK |
| T5: Create Mongo base abstractions | 1 shared persistence concern | OK |
| T6: Create user and session persistence foundations | 1 persistence slice for auth prerequisites | OK |
| T7: Create auth token and password services | 1 auth core service slice | OK |
| T8: Create auth guard and access helpers | 1 auth access-control slice | OK |
| T9: Implement auth HTTP flow | 1 feature slice for register/login/refresh | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | OK |
| T2 | T1, T3, T4, T5 | T1 -> T3/T4/T5 -> T2 | OK |
| T3 | T1 | T1 -> T3 | OK |
| T4 | T1 | T1 -> T4 | OK |
| T5 | T1 | T1 -> T5 | OK |
| T6 | T5 | T5 -> T6 | OK |
| T7 | T3, T6 | T3 -> T7 and T6 -> T7 | OK |
| T8 | T7 | T7 -> T8 | OK |
| T9 | T2, T4, T6, T7, T8 | T2/T4/T6/T7/T8 -> T9 | OK |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Project config only | none | none | OK |
| T2 | Module wiring and bootstrapping | e2e | e2e | OK |
| T3 | Shared infrastructure utilities | unit | unit | OK |
| T4 | Shared HTTP utilities and error mapping | unit | unit | OK |
| T5 | Shared database utilities | unit | unit | OK |
| T6 | Repository adapters and schema foundations | unit | unit | OK |
| T7 | Application services | unit | unit | OK |
| T8 | Guards and access helpers | unit | unit | OK |
| T9 | Controllers and HTTP routes | e2e | e2e | OK |

---

## Blocked Follow-up Backlog

Do not execute these yet. They require the unresolved domain and API decisions listed in the design doc.

- Loans module implementation
- Payments module implementation
- Dashboard financial summaries
- Final API error semantics for cross-user resource access
- Final Mongo indexes and domain-specific schema constraints for loans and payments

---

## Execution Tooling Question

Before execution, confirm which tooling you want used per task.

**Available MCPs**: none explicitly configured for this project workflow yet
**Available Skills**:

- `tlc-spec-driven`
