# Glossary and Assumptions Specification

## Problem Statement

EmprestApp has a strong product vision, but the current brief still mixes confirmed rules, domain terms, and open business decisions. Without a canonical glossary and explicit assumptions register, later domain specs risk inconsistent terminology, conflicting calculations, and rework across API, data model, and implementation.

## Goals

- [ ] Establish a canonical vocabulary for the MVP so the same domain terms are used consistently across specs, contracts, and code.
- [ ] Separate confirmed rules from working assumptions and open questions before domain modeling starts.
- [ ] Create a reference artifact that reduces ambiguity for all later specs in the project.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Final financial formulas for every loan scenario | Belongs to domain calculation specs, not foundation naming/alignment |
| REST endpoint definitions | Belongs to API contract specs |
| Database schema design | Belongs to data model specs |
| UI copywriting and visual design | Frontend is outside the current backend-first scope |

---

## User Stories

### P1: Canonical Domain Vocabulary [MVP]

**User Story**: As a product and engineering team, I want a shared glossary of domain terms so that every later specification uses the same meaning for the same concept.

**Why P1**: If vocabulary is inconsistent, every downstream phase becomes unreliable.

**Acceptance Criteria**:

1. WHEN the glossary spec is published THEN it SHALL define the MVP meaning of core terms including `User`, `Contact`, `Loan`, `Payment`, principal, interest, due date, balance, installment, open, paid, and overdue.
2. WHEN a term could be confused with another concept THEN the glossary SHALL distinguish it explicitly and document the preferred canonical term.
3. WHEN later specs reference a glossary term THEN they SHALL be able to reuse the published definition without redefining it.

**Independent Test**: Review the glossary document and verify that a new contributor can identify the meaning of each core term without consulting chat history.

---

### P1: Assumption Register for Open Business Rules [MVP]

**User Story**: As a spec author, I want open rules recorded as assumptions and questions so that the team does not accidentally treat undefined behavior as settled fact.

**Why P1**: The project explicitly forbids assuming undefined rules and several critical loan rules are still incomplete.

**Acceptance Criteria**:

1. WHEN a business rule is confirmed by the project brief THEN the assumptions artifact SHALL label it as confirmed input.
2. WHEN a business rule is not yet fully defined THEN the assumptions artifact SHALL record it as a working assumption or open question instead of a final rule.
3. WHEN a downstream spec depends on an unresolved rule THEN it SHALL be able to reference the relevant assumption or question by identifier.

**Independent Test**: Inspect the assumptions artifact and confirm that unresolved topics like payment allocation, overdue handling, installment semantics, and interest timing are explicitly flagged as unresolved or provisional.

---

### P1: Decision Boundary for MVP Scope [MVP]

**User Story**: As the project lead, I want foundation-level scope boundaries attached to the glossary and assumptions package so that domain refinement stays inside the MVP.

**Why P1**: Open questions can easily expand scope unless the MVP boundary is restated in the same place as the assumptions.

**Acceptance Criteria**:

1. WHEN the assumptions package is read THEN it SHALL restate which product capabilities are in MVP and which are deferred.
2. WHEN a deferred idea appears during domain clarification THEN the foundation docs SHALL provide a place to record it without turning it into an active requirement.
3. WHEN a later spec introduces a capability outside MVP THEN reviewers SHALL be able to identify the mismatch against the documented boundary.

**Independent Test**: Cross-check the assumptions package against `PROJECT.md` and `ROADMAP.md` and verify that deferred items remain separate from MVP rules.

---

### P2: Spec Authoring Conventions for Foundation Terms

**User Story**: As a future spec author, I want naming and reference conventions so that glossary entries and assumptions stay traceable across domain, API, and data specs.

**Why P2**: This improves maintainability, but later phases can start once P1 is complete.

**Acceptance Criteria**:

1. WHEN a glossary term is documented THEN the artifact SHALL identify its canonical label and a concise definition.
2. WHEN an assumption is documented THEN the artifact SHALL indicate whether it is confirmed, provisional, or open.
3. WHEN a later spec references a foundational item THEN it SHALL be possible to cite the term or assumption identifier directly.

**Independent Test**: Review the format and verify that at least one glossary entry and one assumption can be cited unambiguously from another document.

---

## Edge Cases

- WHEN two common words could refer to the same concept, such as debt versus loan balance, THEN the glossary SHALL choose one canonical term and note the rejected synonym.
- WHEN a rule is partially known but not precise enough to implement, THEN the assumptions artifact SHALL mark it as provisional rather than forcing a final definition.
- WHEN a deferred product idea emerges during clarification, THEN the foundation docs SHALL record it separately from active MVP assumptions.
- WHEN a later domain spec needs a term not yet in the glossary, THEN that gap SHALL be treated as a documentation update requirement before implementation proceeds.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FOUND-01 | P1: Canonical Domain Vocabulary | Design | Pending |
| FOUND-02 | P1: Canonical Domain Vocabulary | Design | Pending |
| FOUND-03 | P1: Canonical Domain Vocabulary | Design | Pending |
| FOUND-04 | P1: Assumption Register for Open Business Rules | Design | Pending |
| FOUND-05 | P1: Assumption Register for Open Business Rules | Design | Pending |
| FOUND-06 | P1: Assumption Register for Open Business Rules | Design | Pending |
| FOUND-07 | P1: Decision Boundary for MVP Scope | Design | Pending |
| FOUND-08 | P1: Decision Boundary for MVP Scope | Design | Pending |
| FOUND-09 | P1: Decision Boundary for MVP Scope | Design | Pending |
| FOUND-10 | P2: Spec Authoring Conventions for Foundation Terms | - | Pending |
| FOUND-11 | P2: Spec Authoring Conventions for Foundation Terms | - | Pending |
| FOUND-12 | P2: Spec Authoring Conventions for Foundation Terms | - | Pending |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] A contributor can read the foundation docs and explain the difference between confirmed rules, assumptions, and open questions without additional clarification.
- [ ] All later domain specs can reuse a stable set of core terms without redefining them inconsistently.
- [ ] At least the currently known open financial-rule gaps are explicitly captured before domain calculations are specified.
