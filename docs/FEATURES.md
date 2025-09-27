# Task Manager API - Features Documentation

This document provides comprehensive documentation for all features available in the Task Manager API.

## Table of Contents

1. [Core Task Management](#core-task-management)
2. [Kanban Board System](#kanban-board-system)
3. [Drag & Drop Task Movement](#drag--drop-task-movement)
4. [Board Sharing & Permissions](#board-sharing--permissions)
5. [Analytics & Insights](#analytics--insights)
6. [User Authentication & Authorization](#user-authentication--authorization)
7. [Notifications & Email](#notifications--email)
8. [API Documentation](#api-documentation)

## Core Task Management

### Task Creation and Management

Create, update, and manage tasks with comprehensive metadata.

**Features:**
- CRUD operations for tasks
- Status tracking (pending, in-progress, completed, overdue)
- Priority levels (low, medium, high)
- Due dates and scheduling
- Subtasks and nested task management
- Comments and attachments
- Labels and categorization
- Assignment to users

**Example: Creating a Task**

```bash
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "status": "pending",
  "priority": "high",
  "dueDate": "2024-01-15T10:00:00Z",
  "assignedTo": "60f7b3b3b3b3b3b3b3b3b3b3",
  "labels": ["backend", "security"],
  "subtasks": [
    {
      "title": "Setup JWT middleware",
      "status": "pending"
    },
    {
      "title": "Create login endpoint",
      "status": "pending"
    }
  ]
}
```

### Recurring Tasks

Automate task creation with flexible scheduling patterns.

**Features:**
- Multiple frequency options (daily, weekly, monthly, yearly)
- Custom intervals and specific days
- End date or occurrence limits
- Automatic task generation via cron service

**Example: Creating a Recurring Task**

```bash
POST /api/tasks/recurring
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Weekly team standup",
  "description": "Regular team synchronization meeting",
  "priority": "medium",
  "dueDate": "2024-01-08T09:00:00Z",
  "isRecurring": true,
  "recurrence": {
    "frequency": "weekly",
    "interval": 1,
    "daysOfWeek": [1], // Monday
    "endDate": "2024-12-31T23:59:59Z"
  }
}
```

## Kanban Board System

### Board Management

Create and manage Kanban boards for visual task organization.

**Features:**
- Customizable columns with position ordering
- Color-coded columns and WIP limits
- Board visibility settings (private, team, public)
- Member management with roles
- Board templates and duplication

**Example: Creating a Board**

```bash
POST /api/boards
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Product Development Board",
  "description": "Main board for product development tasks",
  "columns": [
    {
      "title": "Backlog",
      "position": 0,
      "color": "#e74c3c",
      "wipLimit": null
    },
    {
      "title": "In Progress",
      "position": 1,
      "color": "#f39c12",
      "wipLimit": 3
    },
    {
      "title": "Review",
      "position": 2,
      "color": "#3498db",
      "wipLimit": 2
    },
    {
      "title": "Done",
      "position": 3,
      "color": "#27ae60",
      "wipLimit": null
    }
  ],
  "visibility": "team",
  "settings": {
    "enableWipLimits": true,
    "autoArchiveCompleted": true,
    "autoArchiveDays": 30
  }
}
```

### Column Management

Dynamically manage board columns and workflow stages.

**Features:**
- Add, update, remove, and reorder columns
- WIP (Work-In-Progress) limits
- Column collapse/expand functionality
- Color customization

**Example: Adding a Column**

```bash
POST /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/columns
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Testing",
  "position": 2,
  "color": "#9b59b6",
  "wipLimit": 2,
  "isCollapsed": false
}
```

## Drag & Drop Task Movement

### Task Movement Within Boards

Move tasks between columns and reorder within columns with full position tracking.

**Features:**
- Move tasks between columns
- Reorder tasks within columns
- Bulk task movement operations
- WIP limit enforcement
- Automatic status updates based on column

**Example: Moving a Task**

```bash
PATCH /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/tasks/60f7b3b3b3b3b3b3b3b3b3b4/move
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceColumnId": "60f7b3b3b3b3b3b3b3b3b3b5",
  "targetColumnId": "60f7b3b3b3b3b3b3b3b3b3b6",
  "sourcePosition": 1,
  "targetPosition": 0
}
```

### Bulk Operations

Efficiently move multiple tasks in a single operation.

**Example: Bulk Move Tasks**

```bash
PATCH /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/bulk-move
Authorization: Bearer <token>
Content-Type: application/json

{
  "moves": [
    {
      "taskId": "60f7b3b3b3b3b3b3b3b3b3b7",
      "sourceColumnId": "60f7b3b3b3b3b3b3b3b3b3b5",
      "targetColumnId": "60f7b3b3b3b3b3b3b3b3b3b6",
      "sourcePosition": 0,
      "targetPosition": 1
    },
    {
      "taskId": "60f7b3b3b3b3b3b3b3b3b3b8",
      "sourceColumnId": "60f7b3b3b3b3b3b3b3b3b3b5",
      "targetColumnId": "60f7b3b3b3b3b3b3b3b3b3b6",
      "sourcePosition": 1,
      "targetPosition": 2
    }
  ]
}
```

## Board Sharing & Permissions

### Invitation System

Invite users to boards with role-based permissions and email notifications.

**Features:**
- Email-based invitations
- Direct user invitations
- Role assignment (admin, member, viewer)
- Invitation expiration and management
- Email notifications with templates

**Example: Inviting a User**

```bash
POST /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "teammate@example.com",
  "role": "member",
  "message": "Welcome to our project board! Let's collaborate on the upcoming features.",
  "inviteType": "email"
}
```

### Public Sharing Links

Generate shareable links for quick board access.

**Features:**
- Configurable expiration times
- Role-based access for link users
- Reusable sharing links
- Access tracking and analytics

**Example: Generating a Sharing Link**

```bash
POST /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/sharing-link
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "viewer",
  "expiresIn": 604800000 // 7 days in milliseconds
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "link": "https://taskmanager.com/boards/join/abc123xyz789",
    "token": "abc123xyz789",
    "expiresAt": "2024-01-15T10:00:00Z",
    "role": "viewer"
  },
  "message": "Sharing link generated successfully"
}
```

### Permission Management

Fine-grained control over board access and capabilities.

**Example: Updating Board Permissions**

```bash
PATCH /api/boards/60f7b3b3b3b3b3b3b3b3b3b3/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "visibility": "team",
  "settings": {
    "allowGuestView": false,
    "requireApprovalForJoin": true,
    "enableWipLimits": true,
    "autoArchiveCompleted": true,
    "autoArchiveDays": 14
  }
}
```

## Analytics & Insights

### User Analytics

Personal productivity insights and recommendations.

**Features:**
- Task completion rates and trends
- Time-to-completion analysis
- Productivity recommendations
- Activity timeline and patterns
- Performance comparisons over time

**Example: Getting User Analytics**

```bash
GET /api/analytics/user?period=month&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTasks": 45,
      "boardsCreated": 3,
      "period": "month"
    },
    "taskBreakdown": {
      "byStatus": {
        "completed": 32,
        "in-progress": 8,
        "pending": 5
      },
      "byPriority": {
        "high": 12,
        "medium": 23,
        "low": 10
      }
    },
    "productivity": {
      "completionRate": 71,
      "avgDaysToComplete": 2.3,
      "totalCompleted": 32,
      "trends": [...]
    }
  }
}
```

### Board Analytics

Comprehensive board performance and team metrics.

**Features:**
- Team activity and contributions
- Workflow bottleneck identification
- Velocity tracking and burndown charts
- Column utilization and WIP analysis
- Member performance comparison

**Example: Getting Board Analytics**

```bash
GET /api/analytics/board/60f7b3b3b3b3b3b3b3b3b3b3?period=quarter
Authorization: Bearer <token>
```

### Dashboard Overview

Quick insights for daily productivity tracking.

**Example: Getting Dashboard Data**

```bash
GET /api/analytics/dashboard?period=week
Authorization: Bearer <token>
```

### Data Export

Export analytics data in multiple formats for external analysis.

**Example: Exporting Analytics**

```bash
GET /api/analytics/export?type=user&format=csv&period=month
Authorization: Bearer <token>
```

## User Authentication & Authorization

### JWT-Based Authentication

Secure token-based authentication with refresh token rotation.

**Features:**
- User registration and login
- JWT access tokens with short expiration
- Refresh token rotation for security
- Role-based access control (admin, user)
- Password reset functionality

**Example: User Registration**

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Example: User Login**

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Role-Based Access Control (RBAC)

Granular permissions based on user roles and board membership.

**Permission Levels:**
- **System Admin**: Full system access
- **Board Owner**: Complete board control
- **Board Admin**: Manage board and members
- **Board Member**: Create and edit tasks
- **Board Viewer**: Read-only access

## Notifications & Email

### Email Integration

Automated email notifications for important events.

**Features:**
- Board invitation emails
- Task assignment notifications
- Due date reminders
- Activity summaries
- Ethereal test account integration for development

**Supported Email Events:**
- Board invitations
- Task assignments
- Due date reminders
- Board activity summaries
- System notifications

## API Documentation

### Interactive Documentation

Access comprehensive API documentation through Swagger UI.

**Access Points:**
- **Swagger UI**: `GET /api/docs`
- **OpenAPI JSON**: Available in `docs/openapi.json`
- **Postman Collection**: Available in `postman/` directory

### Postman Integration

Pre-configured Postman collection with:
- All API endpoints
- Environment variables
- Authentication workflows
- Test scripts for automation
- Example requests and responses

**Collection Features:**
- Automatic token management
- Environment-based configuration
- Request/response examples
- Test automation scripts

### Rate Limiting and Security

**Security Features:**
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet security headers
- Input validation with Joi
- MongoDB injection prevention
- XSS protection

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- MongoDB database
- SMTP server for email (or Ethereal for testing)

### Quick Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd task-manager-api
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Documentation**
   - API Docs: http://localhost:5000/api/docs
   - Health Check: http://localhost:5000/api/health

### Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Deployment

The API is production-ready with:
- Environment-based configuration
- Graceful shutdown handling
- Health check endpoints
- Performance monitoring
- Error logging and tracking

For detailed deployment instructions, see the deployment documentation in the project repository.

---

This documentation covers all major features of the Task Manager API. For specific implementation details, code examples, and troubleshooting, refer to the individual API endpoint documentation in Swagger UI at `/api/docs`.