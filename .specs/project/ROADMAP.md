# Roadmap

**Current Milestone:** MVP backend release readiness completed
**Status:** Completed

---

## Milestone 1: Foundation Specs

**Goal:** Establish product direction, shared vocabulary, assumptions, and decision boundaries so the team can refine the domain without ambiguity.
**Target:** Shippable when core product docs are approved and open assumptions are explicit

### Features

**Product Specification** - COMPLETED

- Consolidate vision, target users, problem statement, scope, and constraints
- Define success criteria for the MVP
- Capture explicit out-of-scope boundaries

**Glossary and Ubiquitous Language** - COMPLETED

- Standardize terms such as loan, payment, overdue, balance, installment, and contact
- Remove ambiguity between UI wording and domain wording

**Assumptions and Open Questions** - COMPLETED

- Capture incomplete business rules before implementation
- Separate confirmed rules from proposals
- Prepare decisions needed for later functional specs

---

## Milestone 2: Domain Specs

**Goal:** Define the core business model and deterministic financial behavior of the platform.
**Target:** Shippable when entities, statuses, transitions, and calculations are internally consistent

### Features

**Core Entities and Relationships** - COMPLETED

- Define `User`, `Contact`, `Loan`, and `Payment`
- Document ownership, references, and lifecycle rules
- Clarify invariants and historical preservation rules

**Loan Lifecycle and Status Engine** - COMPLETED

- Define `open`, `paid`, and `overdue` states
- Specify status derivation rules and transitions
- Define how due dates, payments, and settlement affect status

**Financial Calculation Rules** - COMPLETED

- Define principal, optional interest, and interest modes
- Define deterministic remaining balance calculations
- Clarify installment behavior, rounding, and late scenarios

---

## Milestone 3: Functional Specs

**Goal:** Turn the domain into concrete MVP behaviors for users and administrators of their own data.
**Target:** Shippable when all major MVP capabilities have traceable requirements

### Features

**Authentication** - COMPLETED

- Registration, login, token refresh, and secure password handling
- Account ownership boundaries
- Data export and deletion flows for LGPD alignment

**Contacts Management** - COMPLETED

- Create, update, list, and archive contacts
- Link contacts to one or more loans
- Support loan tracking even when contact data changes

**Loans Management** - COMPLETED

- Create, edit, view, and list loans
- Support optional interest and optional installments
- Surface current balance, due date, and status

**Payments Management** - COMPLETED

- Register partial and full payments
- Preserve immutable payment history
- Recalculate loan balance and status after each payment

**Dashboard and History** - COMPLETED

- Summarize outstanding, overdue, and paid loans
- Filter historical records
- Navigate to detailed loan views

---

## Milestone 4: API Contracts and Data Model

**Goal:** Freeze transport and persistence contracts before implementation starts.
**Target:** Shippable when endpoints, payloads, errors, schemas, and indexes are specified and coherent

### Features

**API Contracts** - COMPLETED

- Define REST endpoints, DTOs, validations, and error semantics
- Apply the standard response envelope consistently
- Align authentication and domain endpoints

**Mongo Data Model** - COMPLETED

- Define schemas, indexes, and validation boundaries
- Map audit/history requirements into persistence choices
- Protect deterministic reads and write integrity

---

## Milestone 5: Task Breakdown and Implementation

**Goal:** Convert approved specs into executable tasks and incremental backend delivery.
**Target:** Shippable when backend modules are implemented and verified against specs

### Features

**Execution Backlog** - COMPLETED

- Break approved specs into atomic tasks with verification gates
- Sequence dependencies across auth, contacts, loans, payments, and dashboard
- Track implementation progress without spec drift

**Backend Implementation** - COMPLETED

- Implement NestJS modules under `src/modules`
- Add unit and e2e coverage
- Prepare Dockerized local development flow

### API Sprint Plan

Operational execution is tracked in:

- `.specs/project/API-SPRINTS.md`

Current sprint posture:

- Sprint 0: COMPLETED
- Sprint 1: COMPLETED
- Sprint 2: COMPLETED
- Sprint 3: COMPLETED
- Sprint 4: COMPLETED
- Sprint 5: COMPLETED
- Sprint 6: COMPLETED
- Sprint 7: COMPLETED

---

## Immediate Focus

- Prepare commit/release packaging for the validated MVP backend
- Decide whether to open a new post-MVP stabilization or delivery stream

---

## Future Considerations

- Next.js web client for the MVP backend
- React Native mobile client
- Collection reminders and notification workflows
- Reporting and analytics for recurring lenders
- More advanced credit and trust workflows, if product fit justifies them
