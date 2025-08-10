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


