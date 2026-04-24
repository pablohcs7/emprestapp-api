# EmprestApp

**Vision:** EmprestApp is a loan management system for personal lending between individuals, giving lenders a reliable and simple way to track principal, interest, due dates, payments, and delinquency without relying on informal records. The MVP should be consistent, auditable, and easy enough for casual users while remaining rigorous enough for recurring lenders.
**For:** casual lenders and semi-professional recurring lenders who need clear control over personal loans
**Solves:** forgotten payments, unclear balances, unreliable manual tracking, inconsistent interest calculations, and conflict caused by informality

## Goals

- Allow a user to create and manage loans with deterministic balance and status calculation for 100% of active loans in the system.
- Let a user register payments and inspect a trustworthy loan history so they can always answer who owes what, how much was paid, and what remains outstanding.
- Ship an MVP covering authentication, loan management, payment tracking, and dashboard visibility with explicit scope boundaries and implementation-ready specs before coding starts.

## Tech Stack

**Core:**

- Framework: NestJS
- Language: TypeScript with `strict` mode
- Database: MongoDB

**Key dependencies:**

- Mongoose
- `class-validator`
- JWT authentication
- `bcrypt`
- Docker / Docker Compose

## Scope

**v1 includes:**

- User authentication with access control and refresh token flow
- Loan CRUD with principal, optional interest, dates, optional installments, and derived status
- Payment registration with partial and full payments preserved in immutable history
- Dashboard and history views with filters and loan detail visibility
- API contracts, data model, and implementation tasks defined before coding

**Explicitly out of scope:**

- Bank integrations and automatic PIX flows
- Credit scoring and third-party sharing
- Advanced automated collection workflows
- Frontend and mobile implementation beyond planning-level alignment

## Constraints

- Timeline: MVP-first delivery, prioritizing consistency and low rework over breadth
- Technical: no `any`; DTOs required; validation with `class-validator`; unit and e2e tests required; standard API envelope must be preserved
- Resources: backend-first execution; frontend and mobile are future phases
- Domain: some business rules are intentionally incomplete and must be refined through specs before implementation
