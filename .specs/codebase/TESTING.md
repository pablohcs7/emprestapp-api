# Testing Strategy

**Status:** Draft
**Scope:** Greenfield NestJS backend for EmprestApp

---

## Test Types in Use

- Unit tests for pure domain logic, DTO validation helpers, services, guards, and mappers
- E2E tests for HTTP flows, auth flows, module wiring, and critical user journeys

Integration tests are not a separate required layer for the MVP at this stage. Repository behavior should be covered by unit tests where isolated and by e2e tests where persistence wiring matters.

---

## Tooling

- Test runner: Jest
- Unit test environment: NestJS default unit test setup
- E2E test environment: NestJS e2e setup using a dedicated test app bootstrap

---

## Gate Check Commands

| Gate | Command | Use |
| --- | --- | --- |
| quick | `npm run test -- --runInBand` | Fast verification for unit-focused tasks |
| full | `npm run test -- --runInBand && npm run test:e2e -- --runInBand && npm run build` | Verification for HTTP flows, module wiring, and release-safe checkpoints |
| build | `npm run build` | Compile-only validation for setup tasks |

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Gate | Notes |
| --- | --- | --- | --- |
| Pure domain functions and financial calculators | unit | quick | Must remain side-effect free and deterministic |
| DTOs, validators, pipes, guards, mappers | unit | quick | Co-locate tests with behavior |
| Application services | unit | quick | Mock repository ports and auth dependencies |
| Controllers and HTTP routes | e2e | full | Validate envelope, auth, and request/response behavior |
| Module wiring and bootstrapping | e2e | full | Verify real Nest module composition |
| Repository adapters | unit | quick | Persistence correctness also covered by e2e flows |
| Shared infrastructure utilities | unit | quick | Includes config parsing and error mapping |

---

## Parallelism Assessment

| Test Type | Parallel-Safe | Reason |
| --- | --- | --- |
| unit | Yes | Pure and isolated tests should run safely in parallel task execution |
| e2e | No | Shared app bootstrapping and database state make parallel execution risky until proven otherwise |
| none | Yes | Only when the coverage matrix explicitly allows no tests |

---

## Task Planning Rules

- If a task creates or modifies a controller, module wiring, or HTTP route, that task must include e2e coverage and use the `full` gate.
- If a task creates or modifies pure domain rules, DTOs, services, guards, mappers, or repository adapters, that task must include unit coverage and use the `quick` gate unless it also changes HTTP wiring.
- If a task touches multiple layers, use the highest required test type among the affected layers.
- No task may defer required tests to a later task.
