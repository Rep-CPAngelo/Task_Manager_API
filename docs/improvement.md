# Improvements Backlog

Items to address after Milestone 4.

## Testing and Quality
- Add RBAC tests for admin-only user routes and non-admin restrictions on tasks.
- Enforce Jest coverage thresholds and add coverage badges.
- Add CI (GitHub Actions) to run lint and tests on PRs.

## Ops / DevEx
- Add Docker and Docker Compose (API + MongoDB + seed script).
- Validate environment variables on startup with a schema (e.g., Joi) and fail fast.
- Add Makefile/NPM scripts for common workflows (lint, test, seed, start:dev).
- Pre-commit hooks (Husky) for lint/test on staged changes.

## API & Docs (quick wins)
- Add detailed schemas and examples for Users and Health endpoints in OpenAPI.
- Add explicit error responses per route in OpenAPI (common error model).

## DB & Performance
- Add unique index on `users.email` at DB level (besides Mongoose validation).
- Consider composite indexes on `tasks` for common filters (e.g., `{ isDeleted: 1, createdBy: 1 }`).
- Use `.lean()` in list endpoints where serialization of Mongoose documents is not required.



## **Testing & Quality: Full Plan**

### 1. **RBAC (Role-Based Access Control) Tests**
- **Goal:** Ensure only admins can access `/api/users/*` routes, and non-admins are restricted from unauthorized task/user actions.
- **Actions:**
  - Add/expand tests for:
    - Admin-only access to user management endpoints.
    - Non-admins cannot access, update, or delete other users or tasks they don’t own/aren’t assigned.
    - Proper error responses (403 Forbidden, etc.) for unauthorized actions.

### 2. **Enforce Jest Coverage Thresholds**
- **Goal:** Prevent code changes that reduce test coverage below an acceptable level.
- **Actions:**
  - Set minimum coverage thresholds in `jest.config.js` (e.g., 80% for statements, branches, functions, lines).
  - Optionally, add a badge to your README for visual coverage status.

### 3. **Add CI (GitHub Actions) for Lint & Tests**
- **Goal:** Automatically run linting and tests on every pull request and push to main branches.
- **Actions:**
  - Create a `.github/workflows/ci.yml` workflow:
    - Install dependencies
    - Run `npm run lint`
    - Run `npm test` (with coverage)
    - Fail the build if lint or tests fail

---

## **Step-by-Step Execution**

1. **RBAC Tests**
   - Review current test coverage for RBAC.
   - Add/expand tests for all relevant endpoints and roles.

2. **Coverage Thresholds**
   - Update `jest.config.js` with coverage requirements.
   - (Optional) Add a badge to the README.

3. **GitHub Actions CI**
   - Add a workflow file for automated linting and testing.
 
