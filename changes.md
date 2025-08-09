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