# Task Management API – Development Roadmap

## 1. Tech Stack
- **Backend Runtime:** Node.js (JavaScript or TypeScript)
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose ORM) or PostgreSQL (with Sequelize/Prisma)
- **Authentication:** JWT (Access + Refresh Tokens)
- **File Storage:** Local uploads or AWS S3
- **Testing:** Jest + Supertest
- **API Documentation:** Postman / Swagger
- **Version Control:** Git + GitHub/GitLab
- **Optional:** Socket.IO for real-time updates

---

## 2. Project Folder Structure
```
task-manager-api/
│── src/
│   ├── config/          # DB, env, server configs
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Auth, error handling
│   ├── models/          # Database schemas/models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helpers, constants
│   ├── validations/     # Request validation
│   └── app.js           # Main app entry
│── tests/               # Unit & integration tests
│── .env
│── package.json
│── README.md
```

---

## 3. Database Schema (Example: MongoDB + Mongoose)

### User
```js
{
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: Date,
  updatedAt: Date
}
```

### Task
```js
{
  title: String,
  description: String,
  status: { type: String, enum: ["pending", "in-progress", "completed", "overdue"] },
  priority: { type: String, enum: ["low", "medium", "high"] },
  dueDate: Date,
  assignedTo: ObjectId, // User reference
  createdBy: ObjectId, // User reference
  labels: [String],
  subtasks: [
    {
      title: String,
      status: { type: String, enum: ["pending", "completed"] }
    }
  ],
  attachments: [String], // file URLs
  comments: [
    {
      user: ObjectId,
      text: String,
      createdAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. API Endpoints

### Auth
- `POST /auth/register` – Register user
- `POST /auth/login` – Login & get tokens
- `POST /auth/refresh` – Refresh access token
- `POST /auth/logout` – Logout

### Tasks
- `POST /tasks` – Create task
- `GET /tasks` – List tasks (pagination, filter, search)
- `GET /tasks/:id` – Get single task
- `PATCH /tasks/:id` – Update task
- `DELETE /tasks/:id` – Delete task
- `PATCH /tasks/:id/status` – Update task status

### Advanced Features
- `POST /tasks/:id/comments` – Add comment
- `POST /tasks/:id/attachments` – Upload file
- `POST /tasks/:id/subtasks` – Add subtask
- `PATCH /tasks/:id/subtasks/:subId` – Update subtask
- `GET /analytics` – Task statistics

---

## 5. Development Milestones

### **Milestone 1 – Project Setup**
- Initialize Node.js project
- Install dependencies
- Setup Express server
- Connect to database
- Configure ESLint/Prettier

### **Milestone 2 – Authentication**
- Register/Login routes
- JWT implementation (Access + Refresh tokens)
- Role-based middleware

### **Milestone 3 – Task CRUD**
- Create/Read/Update/Delete tasks
- Validation with Joi/Yup
- Pagination & filtering

### **Milestone 4 – Intermediate Features**
- Subtasks
- Comments
- Attachments
- Activity logs

### **Milestone 5 – Advanced Features**
- Recurring tasks
- Reminders & notifications
- Kanban board support
- Analytics endpoints

### **Milestone 6 – Testing & Deployment**
- Unit & integration tests
- Swagger/Postman documentation
- Deploy to Render/Heroku/Vercel

---

## 6. Best Practices
- Use environment variables for secrets
- Hash passwords with bcrypt
- Validate all inputs
- Centralized error handling
- Use DTOs or validators for request bodies
- Implement logging

---

## 7. Learning Goals
By completing this API you will:
- Understand REST API design
- Implement authentication & authorization
- Work with database relationships
- Handle file uploads
- Use pagination, filtering, and sorting
- Write clean, modular backend code
- Deploy a backend service
