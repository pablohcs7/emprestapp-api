# Release Readiness Tasks

**Spec:** `.specs/features/release-readiness/spec.md`
**Status:** In Progress

---

## Execution Plan

```text
R1 -> R2 -> R3 -> R4
```

---

## Task Breakdown

### R1: Add Sprint 7 operational environment artifacts

**What**: Add the environment and container files required to run the API locally with placeholder MVP-safe values.
**Where**: `.env.example`, `.env`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`
**Depends on**: None
**Reuses**: Existing config schema in `src/config/`
**Requirement**: `RR-001`, `RR-002`

**Done when**:

- [ ] A developer can discover all required environment variables from repository files
- [ ] Docker can run the API together with MongoDB for local validation
- [ ] Placeholder secrets are clearly identified as non-production

**Progress**:

- [x] `.env.example` documents required variables
- [x] `.env` provides temporary MVP-only local values
- [x] `Dockerfile`, `.dockerignore`, and `docker-compose.yml` were added
- [x] Docker runtime smoke check passed with API published on host port `3005`

**Tests**: none
**Gate**: build

---

### R2: Add an operational health endpoint and coverage

**What**: Add a small unauthenticated endpoint for health checks and verify it through e2e coverage.
**Where**: `src/`, `test/`
**Depends on**: R1
**Reuses**: Existing app bootstrap and API envelope conventions
**Requirement**: `RR-003`, `RR-005`

**Done when**:

- [ ] `GET /health` responds successfully through the standard envelope
- [ ] E2E coverage asserts the endpoint contract

**Progress**:

- [x] `src/health.controller.ts` added
- [x] `test/app.e2e-spec.ts` now covers `GET /health`

**Tests**: e2e
**Gate**: full

---

### R3: Add release-oriented project documentation

**What**: Document environment setup, local commands, Docker commands, and validation steps.
**Where**: `README.md`
**Depends on**: R1, R2
**Reuses**: Existing scripts in `package.json`
**Requirement**: `RR-004`

**Done when**:

- [ ] The repository documents local setup and execution clearly
- [ ] The repository documents how to run the release gates
- [ ] The repository documents Docker-based startup

**Progress**:

- [x] `README.md` added with local, Docker, and verification instructions

**Tests**: none
**Gate**: build

---

### R4: Re-run the MVP release gate and update handoff context

**What**: Re-run build, unit, and e2e validation after Sprint 7 changes and update persistent context with the result.
**Where**: `.specs/project/STATE.md`, `.specs/project/ROADMAP.md`, `.specs/project/API-SPRINTS.md`
**Depends on**: R1, R2, R3
**Reuses**: Existing Sprint 7 roadmap and handoff records
**Requirement**: `RR-005`

**Done when**:

- [ ] Build passes
- [ ] Unit suite passes
- [ ] E2E suite passes
- [ ] Persistent handoff context reflects the new Sprint 7 status

**Progress**:

- [x] `npm run build` passed
- [x] `npm run test -- --runInBand` passed
- [x] `npm run test:e2e -- --runInBand` passed
- [x] `docker compose up --build -d` passed after host-port parameterization
- [x] `GET /health` returned success from the containerized app

**Tests**: unit, e2e
**Gate**: full
