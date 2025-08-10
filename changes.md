2025-08-10

Commit: feat: Milestone 4 (comments, attachments, subtasks, activity); Swagger UI; Postman flows; in-memory test DB

Changes:
- Added `models/TaskActivity.js` and activity logging in `controllers/taskController.js` for actions: create/update/delete/status, comment, attachment, subtask add/update; added `GET /api/tasks/:id/activity` with pagination.
- Extended Task endpoints: `POST /:id/comments`, `POST /:id/attachments`, `POST /:id/subtasks`, `PATCH /:id/subtasks/:subId`; updated validations in `validations/taskSchemas.js`.
- Enabled `_id` on subtasks in `models/Task.js` to support subtask updates.
- Expanded `docs/openapi.json` with full schemas, request/response models, examples, pagination params; mounted Swagger UI at `/api/docs` via `swagger-ui-express`.
- Updated Postman collection to capture `accessToken`/`refreshToken`, auto-store `task_id` and `subtask_id`, and added new task endpoints and auth token flows (refresh/logout).
- Improved tests: added `tests/tasks.test.js` for Task CRUD, comments, attachments, subtasks, and activity; standardized to use `mongodb-memory-server` in `tests/setup.js`.
- README updated with Tasks section, Swagger docs link, and Postman usage instructions.
- Note: Mongoose warning about duplicate TTL index on `RefreshToken.expiresAt`; consider removing the field-level `index: true` and keep TTL index only.

---

2025-08-10

Commit: feat: Quick wins - database indexes, OpenAPI completion

Changes:
- Added unique database index on `users.email` in `models/User.js` for database-level constraint enforcement.
- Completed OpenAPI documentation in `docs/openapi.json` with missing schemas: `LoginResponse`, `SuccessResponseTask`, `PaginatedTaskResponse`, `PaginatedActivityResponse`.
- Added missing endpoint documentation for Health and Users endpoints with proper request/response schemas and error responses.
- All referenced schemas now properly defined with examples and validation rules.

---

2025-08-10

Commit: feat: DB & Performance optimizations - composite indexes and lean queries

Changes:
- Added composite indexes in `models/Task.js` for common filter combinations: `{ isDeleted, createdBy, createdAt }`, `{ isDeleted, assignedTo, createdAt }`, `{ isDeleted, status, createdAt }`, `{ isDeleted, priority, createdAt }`, `{ isDeleted, dueDate, createdAt }`, `{ isDeleted, createdBy, status }`, `{ isDeleted, assignedTo, status }`.
- Applied `.lean()` optimization to list endpoints in `controllers/taskController.js` and `controllers/userController.js` for improved performance when serialization of Mongoose documents is not required.
- Optimized queries in `getTasks()`, `getActivity()`, `getAllUsers()`, and `searchUsers()` methods for better performance and reduced memory usage.

---

2025-08-09

Commit: feat: add Task CRUD, refresh tokens, Joi validation, role-based auth; implement soft delete for users and tasks

Changes:
- Added `Task` model, controller, and routes with filters, pagination, and text search; mounted at `/api/tasks`.
- Implemented refresh token flow with rotation and logout via `models/RefreshToken.js`; extended `utils/auth.js` with access/refresh token helpers.
- Switched validation to Joi: added `middleware/validate.js`, `validations/authSchemas.js`, `validations/userSchemas.js`, `validations/taskSchemas.js`; updated `routes/auth.js` and `routes/users.js`.
- Added role-based `authorize` middleware and restricted all `/api/users/*` routes to `admin` role.
- Implemented soft delete for users and tasks; added fields to `models/User.js` and `models/Task.js`; updated controllers to exclude soft-deleted records.
- Updated Postman collection to include Tasks endpoints and auth flows; added `scripts/seedDatabase.js` for sample users.
- Updated `env.example` with `JWT_REFRESH_SECRET` and `JWT_REFRESH_EXPIRES_IN`.