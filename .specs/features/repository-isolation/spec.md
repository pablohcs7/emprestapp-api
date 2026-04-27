# Repository Isolation Spec

**Feature:** split workspace into independent API, web, and mobile repositories
**Status:** In Progress

---

## Goal

Restructure the current workspace so the backend API, future web frontend, and future mobile app live in separate top-level folders, each with its own Git repository and no shared repository metadata.

---

## Requirements

### RI-001: Preserve API repository history

The existing API project must move into `emprestapp-api/` without losing its Git history or current tracked files.

### RI-002: Create independent frontend and mobile repositories

The workspace must contain `emprestapp-web/` and `emprestapp-mobile/`, each initialized as its own Git repository with its own local metadata and starter files.

### RI-003: Remove shared Git control at workspace root

The workspace root must stop acting as a Git repository so that the three applications can evolve independently.

### RI-004: Keep repositories operationally independent

Each repository must contain enough local files to be understood and used independently without depending on cross-repository tracked files or shared Git state.

### RI-005: Validate repository boundaries

After the migration:

- `emprestapp-api` must respond to `git status`
- `emprestapp-web` must respond to `git status`
- `emprestapp-mobile` must respond to `git status`
- the workspace root must not contain a controlling `.git` directory

---

## Out of Scope

- Creating the actual frontend application
- Creating the actual mobile application
- Setting up Git remotes for the new web or mobile repositories
- Cross-repository orchestration tooling
