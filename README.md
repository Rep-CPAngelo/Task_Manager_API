# Express.js MVC Boilerplate with MongoDB

A modern, production-ready Node.js + Express.js boilerplate following the MVC (Model-View-Controller) architecture pattern with MongoDB integration, best practices, security features, and comprehensive testing setup.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **MVC Architecture** - Clean separation of concerns
- **MongoDB Integration** - Mongoose ODM with MongoDB Atlas
- **Security** - Helmet, CORS, rate limiting
- **Authentication** - JWT-based authentication with bcrypt
- **Validation** - Express-validator for input validation
- **Error Handling** - Comprehensive error handling middleware
- **Testing** - Jest + Supertest for API testing
- **Code Quality** - ESLint configuration
- **Environment** - Environment variable management
- **Logging** - Morgan for HTTP request logging
- **Compression** - Response compression
- **Health Checks** - Built-in health monitoring endpoints

## 📁 Project Structure

```
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── env.example           # Environment variables template
├── .eslintrc.js          # ESLint configuration
├── jest.config.js        # Jest configuration
├── config/               # Configuration files
│   └── database.js       # MongoDB connection configuration
├── models/               # Data models (MVC)
│   └── User.js          # User model with Mongoose schema
├── controllers/          # Business logic (MVC)
│   ├── authController.js # Authentication controller
│   ├── userController.js # User management controller
│   └── healthController.js # Health check controller
├── middleware/           # Custom middleware
│   ├── auth.js          # Authentication middleware
│   ├── errorHandler.js  # Error handling middleware
│   └── notFound.js      # 404 handler
├── routes/              # API routes
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   └── health.js        # Health check routes
├── utils/               # Utility functions
│   ├── response.js      # Standardized response helpers
│   ├── validation.js    # Validation utilities
│   └── auth.js          # Authentication utilities
└── tests/              # Test files
    ├── setup.js         # Jest setup
    ├── auth.test.js     # Authentication tests
    └── health.test.js   # Health check tests
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rep-CPAngelo/MVC_NodeJS_BoilerPlate.git
   cd MVC_NodeJS_BoilerPlate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your MongoDB configuration.

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://cpangelo0102:w692jqERQGbS0IAl@cluster0.ahi85ym.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=express_boilerplate

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# API Configuration
API_PREFIX=/api
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ MongoDB Integration

This boilerplate uses MongoDB with Mongoose ODM:

- **Connection**: MongoDB Atlas cloud database
- **ODM**: Mongoose for schema management
- **Features**:
  - Automatic password hashing with bcrypt
  - Email uniqueness validation
  - Timestamps (createdAt, updatedAt)
  - Soft delete functionality
  - User roles (user, admin)
  - Search and pagination
  - User statistics

### Database Features

- **User Model**: Complete user management with validation
- **Password Security**: Bcrypt hashing with salt rounds
- **Indexing**: Optimized queries with database indexes
- **Validation**: Schema-level validation with custom messages
- **Virtual Fields**: Computed properties for user profiles

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

## 📘 API Docs and Postman

- Swagger UI is available at `/api/docs` when the server is running.

- A ready-to-use Postman collection is provided at `postman/Task_Manager_API.postman_collection.json`.

How to use the collection:

1. Import the collection into Postman.
2. Variables used by the collection:
   - `host_url`: defaults to `http://localhost:3000`
   - `base_url`: computed as `{{host_url}}/api`
   - `token`: access token, auto-set after login/refresh
   - `refresh_token`: refresh token, auto-set after login/refresh
   - `user_id`: auto-set from login user
   - `task_id`: auto-set after creating a task
   - `subtask_id`: auto-set after creating a subtask
3. Run `Auth > POST /api/auth/login` to populate `token` and `refresh_token`.
4. Subsequent protected requests automatically include `x-auth-token: {{token}}`.
5. Use `Auth Tokens > POST /api/auth/refresh` to rotate and update tokens.
6. Use `Auth Tokens > POST /api/auth/logout` to revoke the current refresh token.
7. Typical Tasks flow:
   - Create task → `task_id` is stored
   - Add subtask → `subtask_id` is stored
   - Update subtask/status, add comment/attachment, view activity → variables are used automatically

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API rate limiting
- **Input Validation** - Request validation
- **JWT Authentication** - Token-based authentication
- **Password Hashing** - Bcrypt with salt rounds
- **MongoDB Security** - Connection string with authentication

## 🧪 Testing

Run tests with:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

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

## 📚 Dependencies

### Production Dependencies
- `express` - Web framework
- `cors` - CORS middleware
- `helmet` - Security headers
- `morgan` - HTTP request logger
- `dotenv` - Environment variables
- `express-rate-limit` - Rate limiting
- `express-validator` - Input validation
- `compression` - Response compression
- `express-async-errors` - Async error handling
- `jsonwebtoken` - JWT token handling
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing

### Development Dependencies
- `nodemon` - Development server
- `jest` - Testing framework
- `supertest` - HTTP testing
- `eslint` - Code linting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run tests and linting
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
