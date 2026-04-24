# State

**Last Updated:** 2026-04-23T00:00:00-03:00
**Current Work:** Sprint 2 completed - ready to start Sprint 3

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

---

## Active Blockers

### B-001: Financial formulas and contract details still need formalization

**Discovered:** 2026-04-15
**Impact:** High. Core business-policy decisions are now confirmed, but loan calculations, installment generation details, API payload shapes, and persistence details still need exact specification before safe implementation of financial modules.
**Workaround:** Use the confirmed assumptions register as the policy source and convert it into domain, API, and data-model specs.
**Resolution:** Produce formal specs for entities, state transitions, calculation formulas in cents, API contracts, and Mongo structures.

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

---

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
| --- | --- | --- | --- | --- |

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
- [ ] Start Sprint 3 contacts implementation

---

## Session Handoff

### H-001: Pause point after Sprint 2 completion (2026-04-23)

**Status:** Ready to resume
**Stopped At:** Start of Sprint 3 execution
**Why Paused:** Sprint 2 auth and session foundation was implemented and verified end-to-end.
**Next Action:** Resume from the contacts backlog and start Sprint 3.
**Implementation Readiness:** Sprint 1 and Sprint 2 are implemented and verified locally; Sprint 3 is the next planned slice.
- [x] Generate execution backlogs for contacts, loans, payments, and dashboard/compliance

---

## Preferences

**Model Guidance Shown:** never
