# API Sprint Plan

**Scope:** Backend API only
**Current Date Baseline:** 2026-04-15
**Planning Status:** Active

This sprint plan translates the current product, design, and task artifacts into an execution order for the API. It separates what is already defined from what is still blocked by unresolved domain rules.

---

## Current Status Snapshot

### Finalized so far

- Product vision, MVP scope, stack, and constraints
- Foundation spec for glossary and assumptions
- Concrete glossary and assumptions artifacts
- Backend architecture design
- Testing strategy for unit and e2e coverage
- Domain specs for entities, states, and financial calculations
- Full API contracts for MVP modules
- Mongo schema and index strategy for MVP collections
- Initial executable tasks for backend scaffold and auth foundation

### Not finalized yet

- Exact implementation formulas and rounding checkpoints in code
- Final implementation-level DTO constraints and pagination metadata
- Any application code

### Active blocker

- Sprint 0 specification is effectively complete; remaining gaps are now implementation-detail refinements, not product-policy blockers

---

## Sprint 0: Specification Closure

**Goal:** Close the minimum domain and contract gaps required to safely implement the financial parts of the API.
**Status:** COMPLETE
**Shippable Outcome:** Approved specification set for the full MVP backend

### Includes

- Write `glossary.md` from the glossary spec
- Write `assumptions.md` from the assumptions spec
- Define entities and relationships
- Define loan states and transitions
- Define financial calculations and payment allocation rules
- Define API contract conventions including response and authorization semantics
- Define Mongo schema and index strategy for the MVP

### Deliverables

- `.specs/features/glossary-assumptions/glossary.md`
- `.specs/features/glossary-assumptions/assumptions.md`
- domain specs for `users`, `contacts`, `loans`, `payments`
- API contract specs
- data model specs

### Blockers Removed by This Sprint

- payment allocation order
- interest accrual timing
- installment semantics
- overpayment handling
- final `404` vs `403` policy

### Exit Criteria

- No open domain rule blocks detailed loan/payment implementation
- Every MVP module has stable requirement references
- Financial modules are ready for detailed task breakdown

### Result

- Completed

---

## Sprint 1: Platform Bootstrap and Shared Infrastructure

**Goal:** Make the backend runnable with shared foundations in place.
**Status:** READY
**Shippable Outcome:** A bootable NestJS API with common config, HTTP conventions, and database foundations

### Planned Tasks

- `T1` Initialize NestJS workspace baseline
- `T3` Create configuration module and environment schema
- `T4` Create standard API envelope and global error mapping
- `T5` Create Mongo connection helpers and shared database abstractions
- `T2` Create application bootstrap and root module wiring

### Multi-agent Execution Plan

- Parallel lane A: `T3`
- Parallel lane B: `T4`
- Parallel lane C: `T5`
- Sequential follow-up: `T2`

### Dependencies

- Starts immediately
- No financial-rule closure required

### Exit Criteria

- API boots successfully
- Global validation and shared error/envelope patterns are active
- Shared database and configuration layers are reusable by modules
- Unit and e2e smoke coverage are passing

---

## Sprint 2: Authentication and User Session Foundation

**Goal:** Deliver secure authentication primitives and core auth HTTP flows.
**Status:** READY
**Shippable Outcome:** Users can register, login, refresh session, and access protected routes

### Planned Tasks

- `T6` Create user and refresh-session persistence foundations
- `T7` Create auth token and password services
- `T8` Create auth guard and current-user access helpers
- `T9` Implement auth HTTP flow for register, login, and refresh

### Multi-agent Execution Plan

- Parallel candidate after Sprint 1 foundation: `T6`
- Then `T7`
- Then `T8`
- Sequential close-out with shared wiring and e2e: `T9`

### Dependencies

- Sprint 1 complete

### Exit Criteria

- Auth endpoints are functional and tested
- Refresh sessions persist correctly
- Protected-route identity resolution works
- Standard API envelope is consistently applied

---

## Sprint 3: Contacts Module

**Goal:** Deliver contact management independent from loan history rules.
**Status:** READY
**Shippable Outcome:** Authenticated users can create, update, list, and archive contacts

### Planned Scope

- contact entity spec confirmation
- contacts API contract
- contacts schema and repository
- contacts service and controller
- contacts e2e coverage

### Why this sprint can come early

Contacts are only lightly coupled to financial calculations, so this module can be implemented before loans and payments once its contract and schema specs are written.

### Dependencies

- Sprint 2 auth and protected-route foundation

### Exit Criteria

- Contact lifecycle endpoints are working
- Archived contacts remain safe for historical loan references

---

## Sprint 4: Loans Domain Core

**Goal:** Implement loan creation, update, listing, detail retrieval, and derived state calculation.
**Status:** READY AFTER SPRINT 2
**Shippable Outcome:** Users can manage loans with deterministic balance and status behavior

### Planned Scope

- loan entity and value object implementation
- loan repository and schema
- loan creation and update flows
- loan detail and list endpoints
- status derivation engine

### Critical Dependencies

- Sprint 2 auth foundation
- Sprint 3 contacts references if contact linking is required in the first release of loans

### Exit Criteria

- Loan status is deterministic
- Loan lifecycle rules are enforced consistently
- Loan endpoints are covered by unit and e2e tests

---

## Sprint 5: Payments and Balance Recalculation

**Goal:** Implement immutable payment registration and financial recomputation flows.
**Status:** READY AFTER SPRINT 4
**Shippable Outcome:** Users can register payments and trust the resulting loan balance and status

### Planned Scope

- payment schema and repository
- payment registration rules
- payment history endpoints
- balance recomputation integration with loans
- rejection of invalid payment cases

### Critical Dependencies

- Sprint 4 loans domain core

### Exit Criteria

- Partial and full payments are persisted immutably
- Loan balance updates are deterministic after each payment
- Invalid payment attempts return the correct domain errors

---

## Sprint 6: Dashboard, History, and Compliance Flows

**Goal:** Deliver summary visibility and account-level data operations needed for the MVP.
**Status:** BLOCKED BY PRIOR MODULES
**Shippable Outcome:** Users can see a dashboard summary, filtered history, and account data operations

### Planned Scope

- dashboard summary endpoints
- history filtering endpoints
- user profile endpoint
- LGPD-aligned export flow
- LGPD-aligned deletion flow

### Dependencies

- Sprint 2 auth
- Sprint 3 contacts
- Sprint 4 loans
- Sprint 5 payments

### Exit Criteria

- Dashboard reflects real financial state
- History filters return stable, auditable records
- Export and deletion flows are implemented with clear ownership boundaries

---

## Sprint 7: Stabilization and Release Readiness

**Goal:** Harden the API for MVP release.
**Status:** COMPLETED
**Shippable Outcome:** The MVP API is testable, documented, and releasable

### Planned Scope

- close remaining test gaps
- validate Docker local environment
- review API error consistency
- review indexes and performance-sensitive queries
- complete operational documentation and environment examples

### Dependencies

- Sprints 1 through 6 complete

### Exit Criteria

- Full build and test suite pass
- Local Docker setup works for development
- API contracts and implementation are aligned

### Current Progress

- release gate revalidated after Sprint 7 changes
- `.env.example`, `.env`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, and `README.md` added
- `GET /health` added as an operational smoke-check endpoint
- Docker Compose startup validated successfully with API exposed on host port `3005`

---

## Recommended Delivery Order

1. Sprint 0
2. Sprint 1
3. Sprint 2
4. Sprint 3
5. Sprint 4
6. Sprint 5
7. Sprint 6
8. Sprint 7

---

## What Is Ready Right Now

- Sprint 1 can start immediately
- Sprint 2 can be prepared now and executed after Sprint 1
- Sprint 3 backlog can be created now because Sprint 0 specifications are closed

## What Is Not Ready Right Now

- Sprint 4 depends on Sprint 2 and ideally Sprint 3 completion
- Sprint 5 depends on Sprint 4
- Sprint 6 depends on prior functional modules
