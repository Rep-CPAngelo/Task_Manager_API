# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run seed` - Seed database with sample data
- `npm run seed:reset` - Reset and re-seed database

## Architecture Overview

This is a Task Manager API built with Express.js following MVC architecture pattern, featuring advanced task management capabilities including recurring tasks, user authentication, and comprehensive API documentation.

### Core Architecture Patterns

**MVC Structure:**
- **Models** (`/models/`) - Mongoose schemas with complex relationships (User, Task, TaskActivity)
- **Controllers** (`/controllers/`) - Business logic handlers that use services
- **Routes** (`/routes/`) - Express route definitions with middleware chains
- **Services** (`/services/`) - Reusable business logic and complex operations

**Key Architectural Components:**

1. **Authentication Flow**: JWT-based with refresh tokens
   - `middleware/auth.js` - Token verification middleware
   - `middleware/authorize.js` - Role-based access control
   - Refresh token rotation pattern implemented

2. **Validation System**: Joi schemas in `/validations/`
   - Schema-based request validation using `middleware/validate.js`
   - Separate schemas for each entity (auth, tasks, users)
   - Custom validation middleware that integrates with error handling

3. **Task Management Architecture**:
   - Complex Task model with embedded schemas (subtasks, comments, attachments)
   - Recurring task system with automated generation via cron service
   - Activity tracking with separate TaskActivity model
   - Soft delete pattern implemented

4. **Service Layer**: Business logic abstraction
   - `recurringTaskService.js` - Handles complex recurring task logic and scheduling
   - `cronService.js` - Automated background job processing (5-minute intervals)

5. **Database Design**:
   - MongoDB with Mongoose ODM
   - Composite indexes for performance optimization
   - Reference relationships between Users and Tasks
   - Embedded documents for subtasks and comments

### Key Features Implemented

- **Recurring Tasks**: Full scheduling system with frequency patterns (daily, weekly, monthly, yearly)
- **Role-Based Access Control**: Admin and user roles with different permissions
- **Comprehensive Task Management**: Comments, attachments, subtasks, activity feeds
- **API Documentation**: OpenAPI/Swagger at `/api/docs`
- **Health Monitoring**: System health endpoints for production monitoring

### Configuration

**Environment Setup:**
- Copy `env.example` to `.env` and configure MongoDB connection
- Required environment variables include `MONGODB_URI`, `JWT_SECRET`, `PORT`

**Server Architecture:**
- Main entry point: `server.js`
- Graceful shutdown handling for background services
- Comprehensive middleware stack (security, CORS, rate limiting, compression)

### Development Notes

**Adding New Features:**
1. Create Mongoose model in `/models/` with proper indexing
2. Add Joi validation schemas in `/validations/`
3. Implement business logic in `/services/` if complex
4. Create controller methods using service layer
5. Define routes with appropriate middleware
6. Update OpenAPI documentation in `/docs/openapi.json`

**Testing Strategy:**
- Jest with Supertest for API testing
- MongoDB Memory Server for test isolation
- Test files in `/tests/` directory

**Codebase Standards:**
- ESLint with Standard configuration
- Async/await pattern throughout
- Comprehensive error handling with custom middleware
- Standardized response format via `utils/response.js`