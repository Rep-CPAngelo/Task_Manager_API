# Task Manager API

A comprehensive, production-ready Task Manager API built with Node.js + Express.js following the MVC architecture pattern. Features advanced task management, Kanban boards, team collaboration, analytics, and comprehensive documentation.

## 🚀 Key Features

### Core Task Management
- **Task CRUD Operations** - Complete task lifecycle management
- **Status Tracking** - pending, in-progress, completed, overdue
- **Priority Levels** - low, medium, high priority management
- **Due Dates & Scheduling** - Flexible date and time management
- **Subtasks & Nesting** - Hierarchical task organization
- **Comments & Attachments** - Rich task collaboration features
- **Labels & Categories** - Flexible task organization
- **Recurring Tasks** - Automated task generation with cron service

### Kanban Board System
- **Visual Task Management** - Drag-and-drop Kanban boards
- **Customizable Columns** - Create and manage workflow stages
- **Position Tracking** - Precise task positioning within columns
- **WIP Limits** - Work-in-progress constraints
- **Color Coding** - Visual organization with custom colors
- **Board Templates** - Reusable board configurations

### Team Collaboration & Sharing
- **Board Sharing** - Email-based and direct user invitations
- **Role-Based Permissions** - owner, admin, member, viewer roles
- **Public Sharing Links** - Configurable expiration and access levels
- **Real-time Collaboration** - Multi-user board management
- **Activity Tracking** - Comprehensive audit trails

### Analytics & Insights
- **User Analytics** - Personal productivity metrics and trends
- **Board Analytics** - Team performance and workflow analysis
- **System Analytics** - Platform-wide statistics (admin only)
- **Productivity Insights** - AI-powered recommendations
- **Data Export** - JSON and CSV export capabilities
- **Dashboard Views** - Quick overview with key metrics

### Technical Features
- **Express.js** - Fast, unopinionated web framework
- **MVC Architecture** - Clean separation of concerns
- **MongoDB Integration** - Mongoose ODM with advanced aggregations
- **JWT Authentication** - Secure token-based auth with refresh tokens
- **Role-Based Access Control** - Granular permissions system
- **Input Validation** - Comprehensive Joi validation schemas
- **Error Handling** - Centralized error management
- **Rate Limiting** - API protection and throttling
- **Security Headers** - Helmet, CORS, XSS protection
- **API Documentation** - Interactive Swagger UI
- **Testing Suite** - Jest + Supertest comprehensive coverage
- **Email Integration** - Automated notifications and invitations

## 📁 Project Structure

```
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .eslintrc.js          # ESLint configuration
├── jest.config.js        # Jest configuration
├── config/               # Configuration files
│   └── database.js       # MongoDB connection configuration
├── models/               # Data models (MVC)
│   ├── User.js          # User model with authentication
│   ├── Task.js          # Task model with Kanban integration
│   ├── Board.js         # Kanban board model
│   └── BoardInvitation.js # Board sharing and invitations
├── controllers/          # Business logic (MVC)
│   ├── authController.js # Authentication & user management
│   ├── userController.js # User CRUD operations
│   ├── taskController.js # Task management & operations
│   ├── boardController.js # Kanban board management
│   ├── analyticsController.js # Analytics & insights
│   └── healthController.js # Health check endpoints
├── services/             # Business logic layer
│   ├── boardService.js   # Board operations & validation
│   ├── boardSharingService.js # Sharing & permissions
│   ├── analyticsService.js # Data analysis & aggregations
│   ├── emailService.js   # Email notifications
│   └── cronService.js    # Recurring task management
├── middleware/           # Custom middleware
│   ├── auth.js          # JWT authentication middleware
│   ├── rbac.js          # Role-based access control
│   ├── validate.js      # Joi validation middleware
│   ├── errorHandler.js  # Error handling middleware
│   └── notFound.js      # 404 handler
├── routes/              # API routes
│   ├── auth.js          # Authentication endpoints
│   ├── users.js         # User management routes
│   ├── tasks.js         # Task CRUD & operations
│   ├── boards.js        # Kanban board management
│   ├── invitations.js   # Board sharing & invitations
│   ├── analytics.js     # Analytics & reporting
│   ├── notifications.js # Notification management
│   └── health.js        # Health check routes
├── validations/         # Joi validation schemas
│   ├── authSchemas.js   # Authentication validation
│   ├── userSchemas.js   # User data validation
│   ├── taskSchemas.js   # Task validation schemas
│   ├── boardSchemas.js  # Board validation schemas
│   └── analyticsSchemas.js # Analytics validation
├── utils/               # Utility functions
│   ├── response.js      # Standardized response helpers
│   ├── validation.js    # Validation utilities
│   ├── auth.js          # Authentication utilities
│   └── analytics.js     # Analytics helper functions
├── docs/                # Documentation
│   ├── openapi.json     # OpenAPI/Swagger specification
│   ├── FEATURES.md      # Comprehensive feature documentation
│   ├── API_EXAMPLES.md  # Practical API usage examples
│   └── TASKS.md         # Development tasks tracking
├── postman/             # Postman collections
│   └── Task_Manager_API.postman_collection.json
└── tests/              # Test files
    ├── setup.js         # Jest configuration
    ├── auth.test.js     # Authentication tests
    ├── task.test.js     # Task management tests
    ├── board.test.js    # Kanban board tests
    ├── analytics.test.js # Analytics tests
    └── health.test.js   # Health check tests
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-manager-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration (MongoDB, JWT secrets, email settings).

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/
MONGODB_DB_NAME=task_manager_api

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration (for invitations and notifications)
EMAIL_FROM=noreply@taskmanager.com
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_ethereal_user
EMAIL_PASS=your_ethereal_pass

# API Configuration
API_PREFIX=/api
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
ENABLE_BOARD_SHARING=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

## 🗄️ Database Features

The Task Manager API uses MongoDB with Mongoose ODM for comprehensive data management:

### Core Models
- **User Model**: Authentication, profiles, and role management
- **Task Model**: Complete task lifecycle with Kanban integration
- **Board Model**: Kanban boards with columns, members, and permissions
- **BoardInvitation Model**: Sharing and invitation management

### Advanced Features
- **Aggregation Pipelines**: Complex analytics and reporting queries
- **Composite Indexes**: Optimized for board and task operations
- **Soft Delete**: Task and user soft deletion with recovery
- **TTL Indexes**: Automatic cleanup of expired invitations
- **Validation**: Comprehensive schema validation with custom messages
- **Referential Integrity**: Proper relationships between collections

### Performance Optimizations
- **Database Indexes**: Strategically placed for query performance
- **Lean Queries**: Memory-efficient data retrieval
- **Population Control**: Selective field population
- **Pagination**: Efficient large dataset handling

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user (returns `accessToken` and `refreshToken`)
- `POST /api/auth/refresh` - Refresh access token (rotates refresh token)
- `POST /api/auth/logout` - Logout and revoke refresh token
- `GET /api/auth/profile` - Get current user profile (Protected)
- `PUT /api/auth/profile` - Update current user profile (Protected)
- `PUT /api/auth/change-password` - Change user password (Protected)

### Users
- `GET /api/users` - Get all users (Protected)
- `GET /api/users/search` - Search users (Protected)
- `GET /api/users/stats` - Get user statistics (Protected)
- `GET /api/users/:id` - Get user by ID (Protected)
- `POST /api/users` - Create a new user (Protected)
- `PUT /api/users/:id` - Update user (Protected)
- `DELETE /api/users/:id` - Delete user (Protected)

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/status` - Detailed health status
- `GET /api/health/system` - System information
- `GET /api/health/database` - Database health check

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks (pagination, filtering, search, sorting)
- `GET /api/tasks/:id` - Get a task
- `PATCH /api/tasks/:id` - Update a task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Soft delete a task
- `POST /api/tasks/:id/comments` - Add a comment
- `POST /api/tasks/:id/attachments` - Add an attachment by URL
- `POST /api/tasks/:id/subtasks` - Add a subtask
- `PATCH /api/tasks/:id/subtasks/:subId` - Update a subtask
- `GET /api/tasks/:id/activity` - Paginated task activity feed
- `POST /api/tasks/recurring` - Create recurring task
- `GET /api/tasks/recurring` - Get recurring tasks

### Kanban Boards
- `POST /api/boards` - Create a new board
- `GET /api/boards` - Get user's boards (with filtering)
- `GET /api/boards/public` - Get public boards
- `GET /api/boards/:id` - Get specific board details
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board
- `POST /api/boards/:id/columns` - Add column to board
- `PATCH /api/boards/:id/columns/:columnId` - Update column
- `DELETE /api/boards/:id/columns/:columnId` - Delete column
- `PATCH /api/boards/:id/tasks/:taskId/move` - Move task between columns
- `PATCH /api/boards/:id/bulk-move` - Bulk move tasks

### Board Sharing & Permissions
- `POST /api/boards/:id/invite` - Invite users to board
- `POST /api/boards/:id/sharing-link` - Generate public sharing link
- `PATCH /api/boards/:id/permissions` - Update board permissions
- `GET /api/boards/:id/members` - Get board members
- `PATCH /api/boards/:id/members/:userId` - Update member role
- `DELETE /api/boards/:id/members/:userId` - Remove member
- `GET /api/invitations/:token/preview` - Preview invitation
- `POST /api/invitations/:token/accept` - Accept invitation
- `POST /api/invitations/:token/decline` - Decline invitation

### Analytics & Insights
- `GET /api/analytics/dashboard` - Dashboard overview
- `GET /api/analytics/user` - User productivity analytics
- `GET /api/analytics/board/:boardId` - Board performance metrics
- `GET /api/analytics/team` - Team collaboration metrics
- `GET /api/analytics/system` - System-wide analytics (admin only)
- `GET /api/analytics/productivity` - Productivity insights & recommendations
- `GET /api/analytics/collaboration` - Collaboration analysis
- `GET /api/analytics/export` - Export analytics data (JSON/CSV)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

## 📘 Documentation & API Access

### Interactive API Documentation
- **Swagger UI**: Available at `/api/docs` when the server is running
- **OpenAPI Specification**: Complete API documentation in `docs/openapi.json`
- **Feature Guide**: Comprehensive documentation in `docs/FEATURES.md`
- **API Examples**: Practical implementation guide in `docs/API_EXAMPLES.md`

### Postman Collection
A complete Postman collection is provided at `postman/Task_Manager_API.postman_collection.json` with:

**Pre-configured Variables:**
- `host_url`: defaults to `http://localhost:3000`
- `base_url`: computed as `{{host_url}}/api`
- `token`: access token (auto-managed)
- `refresh_token`: refresh token (auto-managed)
- `user_id`, `task_id`, `board_id`, `column_id`: auto-populated IDs

**Collection Features:**
- **Authentication Flow**: Automatic token management and rotation
- **Board Management**: Complete Kanban board operations
- **Task Operations**: Full task lifecycle with drag-and-drop support
- **Analytics**: All reporting and insight endpoints
- **Sharing & Permissions**: Board collaboration features
- **Test Scripts**: Automated validation for all endpoints

**Quick Start:**
1. Import the collection into Postman
2. Run `Auth > Login` to authenticate and populate tokens
3. Explore boards, tasks, and analytics with pre-configured requests
4. All variables are automatically managed across requests

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens** - Secure access tokens with refresh token rotation
- **Role-Based Access Control** - Granular permissions (admin, user, board roles)
- **Password Security** - Bcrypt hashing with salt rounds
- **Session Management** - Secure token lifecycle management

### API Security
- **Helmet** - Comprehensive security headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Intelligent request throttling (100 req/15min)
- **Input Validation** - Joi schema validation for all endpoints
- **MongoDB Injection Prevention** - Schema-based protection
- **XSS Protection** - Request sanitization and output encoding

### Data Protection
- **Soft Delete** - Data recovery capabilities
- **Audit Trails** - Complete activity logging
- **Secure Invitations** - Token-based board sharing with expiration
- **Environment Isolation** - Separate development/production configs

## 🧪 Testing

The API includes comprehensive test coverage for all features:

### Test Categories
- **Authentication Tests** - User registration, login, token management
- **Task Management Tests** - CRUD operations, status updates, recurring tasks
- **Board Tests** - Kanban functionality, drag-and-drop, permissions
- **Analytics Tests** - Data aggregation, insights, export functionality
- **Integration Tests** - End-to-end workflow testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testNamePattern="Board"
```

### Test Features
- **Jest + Supertest** - Comprehensive API testing framework
- **Database Isolation** - Clean test database for each test suite
- **Mock Services** - Email and external service mocking
- **Performance Testing** - Response time and load testing
- **Security Testing** - Authentication and authorization validation

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

## 🔧 Customization

### Adding New Routes

1. Create a new route file in `routes/`
2. Import and use in `server.js`

### Adding Controllers

1. Create a new controller in `controllers/`
2. Import and use in your route files

### Adding Models

1. Create a new model in `models/`
2. Import and use in your controllers

### Adding Middleware

1. Create middleware in `middleware/`
2. Import and use in `server.js`

## 📚 Key Dependencies

### Core Framework
- **express** - Fast, minimalist web framework
- **mongoose** - MongoDB object modeling for Node.js
- **joi** - Schema validation for JavaScript objects

### Security & Authentication
- **jsonwebtoken** - JSON Web Token implementation
- **bcryptjs** - Password hashing library
- **helmet** - Security middleware for Express
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Basic rate-limiting middleware

### Development & Testing
- **nodemon** - Development server with auto-restart
- **jest** - JavaScript testing framework
- **supertest** - HTTP testing library
- **eslint** - JavaScript linting utility

### Additional Features
- **node-cron** - Task scheduler for recurring tasks
- **nodemailer** - Email sending functionality
- **compression** - Response compression middleware
- **morgan** - HTTP request logging
- **swagger-ui-express** - API documentation interface

## 🚀 Production Deployment

The Task Manager API is production-ready with:

### Deployment Features
- **Environment Configuration** - Separate dev/staging/production configs
- **Health Check Endpoints** - Monitoring and uptime verification
- **Graceful Shutdown** - Proper cleanup on process termination
- **Error Logging** - Comprehensive error tracking and reporting
- **Performance Monitoring** - Built-in metrics and profiling

### Recommended Stack
- **Runtime**: Node.js 16+ with PM2 for process management
- **Database**: MongoDB Atlas for cloud database hosting
- **Hosting**: AWS EC2, Google Cloud, or Heroku
- **Monitoring**: New Relic, DataDog, or similar APM tools
- **Reverse Proxy**: Nginx for load balancing and SSL termination

## 📊 Key Metrics & Analytics

The API provides comprehensive analytics including:

- **User Productivity**: Task completion rates, time-to-completion analysis
- **Team Collaboration**: Board activity, member participation metrics
- **System Performance**: API response times, error rates, usage patterns
- **Business Intelligence**: Growth metrics, feature adoption, user engagement
- **Custom Reports**: Exportable data in JSON and CSV formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Add comprehensive tests for new features
5. Run tests and ensure all pass (`npm test`)
6. Run linting to ensure code quality (`npm run lint`)
7. Update documentation if needed
8. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Community

- **Documentation**: Comprehensive guides in `/docs` directory
- **API Reference**: Interactive Swagger UI at `/api/docs`
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas

---

**Built with ❤️ using Node.js + Express.js**

Ready to manage tasks efficiently? Start with the comprehensive API documentation and explore the powerful features of this production-ready Task Manager API.
