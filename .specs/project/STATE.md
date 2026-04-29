# State

**Last Updated:** 2026-04-29T10:20:00-03:00
**Current Work:** public-surface security hardening completed for auth/session validation, resource scoping, DTO input validation, defensive headers, auth throttling, and log redaction

---

## Recent Decisions (Last 60 days)

### AD-001: Backend-first MVP execution (2026-04-15)

**Decision:** Start the project by producing specification artifacts and a backend-first roadmap before any application code is written.
**Reason:** The project has multiple incomplete business rules and explicitly requires spec-driven development to avoid rework.
**Trade-off:** Initial delivery of runnable code is delayed in favor of stronger definition quality.
**Impact:** All upcoming work should begin with foundation, domain, and contract specs before implementation tasks are created.

### AD-002: MVP scope bounded to personal loan management core (2026-04-15)

**Decision:** Limit the MVP to authentication, contacts, loans, payments, dashboard visibility, and supporting compliance/data controls.
**Reason:** The product goal is a consistent and reliable first release, not breadth.
**Trade-off:** Payment automation, banking integrations, and richer growth features are deferred.
**Impact:** Specs and tasks should reject scope expansion unless it directly supports the MVP core.

### AD-003: Canonical backend stack fixed early (2026-04-15)

**Decision:** Standardize the backend around NestJS, strict TypeScript, MongoDB, Mongoose, DTO validation, JWT, and bcrypt.
**Reason:** The master context already defines the intended stack and quality bar.
**Trade-off:** Architectural experiments outside this stack are out of scope for the MVP.
**Impact:** Future specs should align modules, contracts, and testing strategy to this stack.

### AD-004: MVP backend will start as a modular monolith (2026-04-15)

**Decision:** Structure the backend as a NestJS modular monolith with feature modules and internal separation between controllers, application services, domain rules, and repository adapters.
**Reason:** This preserves simplicity for the MVP while keeping domain logic isolated enough for later growth.
**Trade-off:** There is no early service-level isolation for independent deployment.
**Impact:** Upcoming tasks should scaffold module boundaries first and keep cross-module coupling minimal.

### AD-005: MVP testing baseline is unit plus e2e (2026-04-15)

**Decision:** Use unit tests for domain and service layers and e2e tests for HTTP flows and module wiring, with Jest-based gate commands.
**Reason:** This matches the project quality bar while staying practical for a greenfield NestJS backend.
**Trade-off:** There is no distinct integration-test layer at MVP start.
**Impact:** Task breakdown can now assign required tests and verification gates consistently.

### AD-006: API delivery will follow sprint waves with spec-first gates (2026-04-15)

**Decision:** Organize backend execution into sprint waves, starting with specification closure, then platform foundation, then auth, then domain modules.
**Reason:** This creates an execution order that respects current blockers instead of forcing premature implementation.
**Trade-off:** Some modules will intentionally wait even if engineering capacity exists.
**Impact:** Work should be pulled according to sprint readiness, not only feature importance.

### AD-007: Product repositories must be isolated by application boundary (2026-04-27)

**Decision:** Split the workspace into `emprestapp-api`, `emprestapp-web`, and `emprestapp-mobile`, each with its own Git repository and no shared repository metadata.
**Reason:** Backend, web, and mobile will be planned and delivered independently, with separate history and operational ownership.
**Trade-off:** Cross-product changes now require explicit coordination across repositories instead of a single shared commit stream.
**Impact:** API planning artifacts remain inside `emprestapp-api`, and future frontend/mobile work must not depend on a shared root repository.

---

## Active Blockers

No active delivery blockers are currently recorded for the API repository. Repository isolation for web and mobile has been completed at the workspace level.

---

## Lessons Learned

### L-001: The product brief is detailed enough for initialization but not for implementation

**Context:** The master project context provides vision, stack, entities, and high-level rules.
**Problem:** Several critical domain details remain intentionally open.
**Solution:** Initialize `.specs/project` now and defer code until feature/domain specs formalize the missing rules.
**Prevents:** Premature implementation and later contract or data-model churn.

### L-002: Spec externalization reduced session dependency (2026-04-15)

**Context:** The project moved from product brief to full backend planning with glossary, assumptions, domain, contracts, data model, and task backlogs written to disk.
**Problem:** Chat context becomes expensive and brittle once planning spans many phases.
**Solution:** Persist all critical planning artifacts in `.specs/` and pause implementation only after the next executable step is clearly documented.
**Prevents:** Losing planning continuity when resuming from a new session.

### L-003: Roadmap drift must be corrected after major implementation waves (2026-04-27)

**Context:** `STATE.md` reflected Sprint 6 completion, but `ROADMAP.md` still described the project as if specification work were the current phase.
**Problem:** Resume decisions become noisy when project memory and planning artifacts disagree about delivery stage.
**Solution:** Revalidate the executable state and update roadmap/status artifacts immediately after each major sprint checkpoint.
**Prevents:** Starting the wrong backlog slice or re-opening already resolved planning work.

### L-004: Release-readiness needs an operational smoke endpoint, not only tests (2026-04-27)

**Context:** Unit and e2e suites already passed before Sprint 7 work started.
**Problem:** That alone was not enough to validate runtime wiring from local tooling or container health checks.
**Solution:** Add a lightweight `/health` endpoint and document it as the standard smoke check for local and Docker flows.
**Prevents:** Ambiguous runtime validation during MVP handoff.

### L-005: Container builds expose config drift that incremental local builds may hide (2026-04-27)

**Context:** `docker compose up --build` failed on the first attempt even though `npm run build` had passed locally.
**Problem:** `tsconfig.build.json` referenced only a placeholder test file, and the local environment masked that with existing incremental artifacts.
**Solution:** Point `tsconfig.build.json` at `src/**/*.ts` and treat container builds as a required clean-build checkpoint.
**Prevents:** Shipping a Docker setup that only works against cached local state.

### L-006: Repository moves done with elevated file operations can affect Git ownership metadata (2026-04-27)

**Context:** Splitting the workspace required moving the API repository and creating two new repositories.
**Problem:** Elevated filesystem operations changed directory ownership and briefly triggered Git safe-directory warnings.
**Solution:** Correct ownership immediately after the move and validate each repository boundary with direct Git commands.
**Prevents:** A structurally correct split that still fails basic Git operations.

---

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
| --- | --- | --- | --- | --- |
| 001 | Add structured HTTP observability logs with request correlation on the API | 2026-04-27 | uncommitted | Done |
| 002 | Harden the public API surface before exposure with auth/session, input, logging, and baseline transport controls | 2026-04-29 | uncommitted | Done |

---

## Deferred Ideas

- [ ] Add automated reminders and collection workflows after the MVP core is stable - Captured during: project initialization
- [ ] Add analytics/reporting for recurring lenders after baseline dashboard validation - Captured during: project initialization
- [ ] Plan frontend and mobile delivery as separate feature streams after backend contracts stabilize - Captured during: project initialization

---

## Todos

- [x] Create foundation specs for glossary and assumptions
- [x] Write glossary and assumptions artifacts from Sprint 0 decisions
- [x] Create domain specs for entities, lifecycle states, and financial calculations
- [x] Resolve payment allocation, interest accrual, installment, and overpayment rules before detailed loan/payment tasks
- [x] Define API contract conventions per module with the standard response envelope
- [x] Define Mongo schemas and indexes after domain invariants are approved
- [x] Break approved specs into executable tasks before implementation
- [x] Start Sprint 1 implementation from `.specs/features/mvp-backend-architecture/tasks.md`
- [x] Execute `T1` first, then run `T3`, `T4`, and `T5` in parallel, then `T2`
- [x] Start Sprint 2 from `T6` in `.specs/features/mvp-backend-architecture/tasks.md`
- [x] Execute `T6`, `T7`, `T8`, and `T9`
- [x] Start Sprint 3 contacts implementation
- [x] Implement Sprint 3 contacts module
- [x] Start Sprint 4 loans implementation
- [x] Execute `L1` from `.specs/features/loans/tasks.md`
- [x] Execute `L2`, `L3`, and `L4` from `.specs/features/loans/tasks.md`
- [x] Execute `L5` from `.specs/features/loans/tasks.md`
- [x] Execute `L6` from `.specs/features/loans/tasks.md`
- [x] Execute `L7` from `.specs/features/loans/tasks.md`
- [x] Start Sprint 5 payments implementation
- [x] Execute `P1` from `.specs/features/payments/tasks.md`
- [x] Execute `P2` from `.specs/features/payments/tasks.md`
- [x] Execute `P3` and `P4` from `.specs/features/payments/tasks.md`
- [x] Execute `P5` from `.specs/features/payments/tasks.md`
- [x] Execute `P6` from `.specs/features/payments/tasks.md`
- [x] Start Sprint 6 dashboard and compliance implementation
- [x] Execute `D1` from `.specs/features/dashboard-compliance/tasks.md`
- [x] Execute `D2`, `D3`, `D4`, and `D5` from `.specs/features/dashboard-compliance/tasks.md`
- [x] Execute `D6` from `.specs/features/dashboard-compliance/tasks.md`
- [x] Revalidate current codebase with build, unit, and e2e suites
- [x] Start Sprint 7 stabilization and release readiness
- [x] Define the executable Sprint 7 backlog from `.specs/project/API-SPRINTS.md`
- [x] Add `.env.example` and `.env` with temporary MVP-only values
- [x] Add `Dockerfile`, `.dockerignore`, and `docker-compose.yml`
- [x] Add operational health endpoint and coverage
- [x] Complete operational documentation and environment examples
- [x] Review API error consistency, indexes, and performance-sensitive queries
- [x] Validate Docker/local environment setup under a running daemon
- [x] Isolate the API repository into `emprestapp-api`
- [x] Initialize independent `emprestapp-web` and `emprestapp-mobile` repositories
- [x] Remove shared Git control from the workspace root

---

## Session Handoff

### H-001: Pause point after Sprint 6 completion (2026-04-24)

**Status:** Ready to resume
**Stopped At:** Start of Sprint 7 execution
**Why Paused:** Sprint 6 dashboard/compliance was implemented end-to-end with unit, e2e, and build gates passing.
**Next Action:** Resume from the stabilization/release-readiness backlog and start Sprint 7.
**Implementation Readiness:** Sprint 1 through Sprint 6 are implemented and verified locally; Sprint 7 is the next planned slice.
- [x] Generate execution backlogs for contacts, loans, payments, and dashboard/compliance

### H-002: Resume review and full-suite revalidation (2026-04-27)

**Status:** Ready to continue
**Stopped At:** Sprint 7 planning entry point, after context reconciliation
**Why Paused:** Reviewed repository state, confirmed clean worktree, and revalidated the implementation with `npm run build`, `npm run test -- --runInBand`, and `npm run test:e2e -- --runInBand`.
**Next Action:** Convert Sprint 7 planned scope into an executable backlog and start with the highest-signal stabilization task.
**Verification Snapshot:** 27 unit suites / 146 tests passed, 6 e2e suites / 34 tests passed, build passed.

### H-003: Sprint 7 operational package implemented (2026-04-27)

**Status:** Ready to continue
**Stopped At:** Post-Sprint-7 handoff point
**Why Paused:** Sprint 7 was completed end-to-end, including Docker Compose runtime validation and container health checks.
**Next Action:** Decide whether to open a stabilization follow-up sprint or prepare commit/release packaging.
**Verification Snapshot:** build passed, 27 unit suites / 146 tests passed, 6 e2e suites / 35 tests passed, `docker compose config` passed, `docker compose up --build -d` passed, `/health` returned success on `http://localhost:3005/health`.

### H-004: Repository isolation completed (2026-04-27)

**Status:** Ready to continue
**Stopped At:** Post-migration workspace handoff
**Why Paused:** The API repository was moved into `emprestapp-api`, `emprestapp-web` and `emprestapp-mobile` were initialized as separate Git repositories, and the shared root `.git` directory was removed.
**Next Action:** Start frontend planning inside `emprestapp-web` or mobile planning inside `emprestapp-mobile`.
**Verification Snapshot:** `git status` works in all three repositories, and the workspace root no longer contains `.git`.

---

## Preferences

**Model Guidance Shown:** never
