# Repository Isolation Tasks

**Spec:** `.specs/features/repository-isolation/spec.md`
**Status:** Draft

---

## Execution Plan

```text
I1 -> I2 -> I3
```

---

## Task Breakdown

### I1: Prepare migration artifacts and target structure

**What**: Define the migration in spec artifacts and create the target directories for the three independent repositories.
**Where**: `.specs/features/repository-isolation/`, workspace root
**Depends on**: None
**Reuses**: Existing `.specs` process
**Requirement**: `RI-001`, `RI-002`, `RI-003`

**Done when**:

- [ ] The migration is documented in `.specs`
- [ ] `emprestapp-api`, `emprestapp-web`, and `emprestapp-mobile` exist as top-level directories

**Tests**: none
**Gate**: build

---

### I2: Move the current API repository into `emprestapp-api`

**What**: Relocate the existing API working tree and `.git` directory into `emprestapp-api/` while preserving repository history.
**Where**: workspace root, `emprestapp-api/`
**Depends on**: I1
**Reuses**: Existing API repository contents
**Requirement**: `RI-001`, `RI-003`

**Done when**:

- [ ] The current API files live under `emprestapp-api/`
- [ ] `emprestapp-api/.git` exists
- [ ] The workspace root no longer contains the API repository `.git`

**Tests**: none
**Gate**: build

---

### I3: Initialize independent web and mobile repositories and validate boundaries

**What**: Add minimal starter files for the future frontend and mobile projects, initialize separate Git repositories for them, and verify repository boundaries.
**Where**: `emprestapp-web/`, `emprestapp-mobile/`
**Depends on**: I2
**Reuses**: None
**Requirement**: `RI-002`, `RI-004`, `RI-005`

**Done when**:

- [ ] `emprestapp-web` is an independent Git repository
- [ ] `emprestapp-mobile` is an independent Git repository
- [ ] Each new repository has a local `README.md` and `.gitignore`
- [ ] Repository-boundary validation commands pass

**Tests**: none
**Gate**: build
