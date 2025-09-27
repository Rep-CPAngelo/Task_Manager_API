# API Examples Guide

This guide provides practical examples for common use cases with the Task Manager API.

## Table of Contents

1. [Authentication Workflow](#authentication-workflow)
2. [WebSocket Real-time Features](#websocket-real-time-features)
3. [Task Management Examples](#task-management-examples)
4. [Board Management Examples](#board-management-examples)
5. [Team Collaboration Examples](#team-collaboration-examples)
6. [Analytics and Reporting](#analytics-and-reporting)
7. [Integration Scenarios](#integration-scenarios)

## Authentication Workflow

### Complete Authentication Flow

```javascript
// 1. Register a new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'project_manager',
    email: 'pm@company.com',
    password: 'SecurePass123!',
    firstName: 'Project',
    lastName: 'Manager'
  })
});

// 2. Login and get tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'pm@company.com',
    password: 'SecurePass123!'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 3. Use access token for authenticated requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};

// 4. Refresh token when needed
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

## WebSocket Real-time Features

### Setting Up WebSocket Connection

```javascript
import { io } from 'socket.io-client';

// Initialize WebSocket connection with authentication
const token = localStorage.getItem('authToken');
const socket = io('http://localhost:3000', {
  auth: { token }
});

// Listen for connection events
socket.on('connected', (data) => {
  console.log('Connected to real-time updates:', data);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error.message);
});
```

### Real-time Task Collaboration

```javascript
// Join a task room to receive real-time updates
socket.emit('join_task', 'task-id-123');

// Listen for task updates
socket.on('task_updated', (event) => {
  switch (event.update.type) {
    case 'task_created':
      addTaskToInterface(event.update.task);
      break;

    case 'task_updated':
      updateTaskInInterface(event.update.task, event.update.changes);
      break;

    case 'task_status_updated':
      updateTaskStatus(event.taskId, event.update.statusChange);
      break;

    case 'comment_added':
      addCommentToTask(event.taskId, event.update.comment);
      break;
  }
});

// Implement typing indicators
let typingTimer;
const taskDescriptionField = document.getElementById('task-description');

taskDescriptionField.addEventListener('input', () => {
  socket.emit('typing_start', {
    taskId: 'task-id-123',
    field: 'description'
  });

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing_stop', {
      taskId: 'task-id-123',
      field: 'description'
    });
  }, 2000);
});

// Listen for other users typing
socket.on('user_typing', (data) => {
  showTypingIndicator(`${data.userName} is typing...`);
});

socket.on('user_stopped_typing', (data) => {
  hideTypingIndicator(data.userId);
});
```

### Real-time Board Synchronization

```javascript
// Join a board room for live collaboration
socket.emit('join_board', 'board-id-456');

// Listen for board updates
socket.on('board_updated', (event) => {
  switch (event.update.type) {
    case 'task_added':
      addTaskToBoard(event.boardId, event.update.taskId);
      break;

    case 'task_removed':
      removeTaskFromBoard(event.boardId, event.update.taskId);
      break;

    case 'column_added':
      addColumnToBoard(event.boardId, event.update.column);
      break;

    case 'column_removed':
      removeColumnFromBoard(event.boardId, event.update.columnId);
      break;
  }
});

// Live drag-and-drop synchronization
function onTaskDrop(taskId, newColumnId, newPosition) {
  // Update UI optimistically
  updateTaskPositionInUI(taskId, newColumnId, newPosition);

  // Send API request
  fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      columnId: newColumnId,
      position: newPosition
    })
  });

  // Real-time update will be received via WebSocket
  // and will sync the change to all other connected users
}
```

### Instant Notifications

```javascript
// Listen for real-time notifications
socket.on('notification', (notification) => {
  // Display notification to user
  showNotificationToast(notification.title, notification.message);

  // Update notification badge
  updateNotificationBadge();

  // Add to notification center
  addToNotificationCenter(notification);

  // Handle different notification types
  switch (notification.type) {
    case 'task_assigned':
      highlightAssignedTask(notification.relatedTask);
      break;

    case 'task_due_soon':
      showDueDateWarning(notification.relatedTask);
      break;

    case 'task_completed':
      celebrateTaskCompletion(notification.relatedTask);
      break;
  }
});

// Example notification display function
function showNotificationToast(title, message) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <h4>${title}</h4>
    <p>${message}</p>
  `;
  document.body.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
}
```

### React Hook for WebSocket Integration

```javascript
// hooks/useWebSocket.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(token) {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (token) {
      socket.current = io('http://localhost:3000', {
        auth: { token }
      });

      socket.current.on('connect', () => {
        setConnected(true);
      });

      socket.current.on('disconnect', () => {
        setConnected(false);
      });

      socket.current.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });

      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    }
  }, [token]);

  const joinBoard = (boardId) => {
    socket.current?.emit('join_board', boardId);
  };

  const joinTask = (taskId) => {
    socket.current?.emit('join_task', taskId);
  };

  const startTyping = (taskId, field) => {
    socket.current?.emit('typing_start', { taskId, field });
  };

  const stopTyping = (taskId, field) => {
    socket.current?.emit('typing_stop', { taskId, field });
  };

  return {
    socket: socket.current,
    connected,
    notifications,
    joinBoard,
    joinTask,
    startTyping,
    stopTyping
  };
}

// Usage in component
function TaskBoard({ boardId }) {
  const { socket, connected, joinBoard } = useWebSocket(localStorage.getItem('token'));
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (connected && boardId) {
      joinBoard(boardId);
    }
  }, [connected, boardId, joinBoard]);

  useEffect(() => {
    if (socket) {
      socket.on('task_updated', (event) => {
        // Update tasks state based on event
        handleTaskUpdate(event);
      });

      socket.on('board_updated', (event) => {
        // Update board state based on event
        handleBoardUpdate(event);
      });

      return () => {
        socket.off('task_updated');
        socket.off('board_updated');
      };
    }
  }, [socket]);

  const handleTaskUpdate = (event) => {
    setTasks(prevTasks => {
      switch (event.update.type) {
        case 'task_created':
          return [...prevTasks, event.update.task];
        case 'task_updated':
          return prevTasks.map(task =>
            task._id === event.taskId ? { ...task, ...event.update.changes } : task
          );
        case 'task_deleted':
          return prevTasks.filter(task => task._id !== event.taskId);
        default:
          return prevTasks;
      }
    });
  };

  return (
    <div className="task-board">
      <div className="connection-status">
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      {/* Board UI */}
    </div>
  );
}
```

### Mobile Real-time Integration

```javascript
// React Native WebSocket integration
import io from 'socket.io-client';
import PushNotification from 'react-native-push-notification';

class MobileTaskManager {
  constructor(token) {
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupMobileListeners();
  }

  setupMobileListeners() {
    // Handle background notifications
    this.socket.on('notification', (notification) => {
      // Show push notification even when app is backgrounded
      PushNotification.localNotification({
        title: notification.title,
        message: notification.message,
        userInfo: {
          notificationId: notification.id,
          taskId: notification.relatedTask
        }
      });

      // Update app badge
      PushNotification.setApplicationIconBadgeNumber(
        this.getUnreadNotificationCount() + 1
      );
    });

    // Handle real-time task updates
    this.socket.on('task_updated', (event) => {
      // Update Redux store or local state
      store.dispatch(updateTask(event));

      // Show in-app notification if app is active
      if (AppState.currentState === 'active') {
        this.showInAppNotification(event);
      }
    });
  }

  showInAppNotification(event) {
    // Use react-native-flash-message or similar
    showMessage({
      message: 'Task Updated',
      description: `${event.update.task?.title} has been updated`,
      type: 'info',
      duration: 3000
    });
  }
}
```

For complete WebSocket API documentation, see [WEBSOCKET_API.md](./WEBSOCKET_API.md).

## Task Management Examples

### Creating a Complex Task with Subtasks

```javascript
const createTask = async () => {
  const taskData = {
    title: "Implement User Dashboard",
    description: "Create a comprehensive user dashboard with analytics and task management",
    status: "pending",
    priority: "high",
    dueDate: "2024-02-15T17:00:00Z",
    labels: ["frontend", "dashboard", "analytics"],
    subtasks: [
      {
        title: "Design dashboard wireframes",
        status: "completed"
      },
      {
        title: "Implement task overview component",
        status: "in-progress"
      },
      {
        title: "Add analytics charts",
        status: "pending"
      },
      {
        title: "Implement responsive design",
        status: "pending"
      }
    ],
    attachments: [
      "https://company.com/designs/dashboard-mockup.png",
      "https://company.com/specs/dashboard-requirements.pdf"
    ]
  };

  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify(taskData)
  });

  return await response.json();
};
```

### Task Status Management Workflow

```javascript
// Complete workflow for task lifecycle management
class TaskManager {
  constructor(authHeaders) {
    this.headers = authHeaders;
  }

  // Create and assign task
  async createAndAssignTask(taskData, assigneeId) {
    const task = await fetch('/api/tasks', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ...taskData,
        assignedTo: assigneeId,
        status: 'pending'
      })
    }).then(res => res.json());

    console.log(`Task created: ${task.data.title}`);
    return task.data;
  }

  // Update task progress
  async updateTaskProgress(taskId, status, comments = []) {
    const updates = { status };

    if (comments.length > 0) {
      // Add comments to track progress
      for (const comment of comments) {
        await fetch(`/api/tasks/${taskId}/comments`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ text: comment })
        });
      }
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(updates)
    });

    return await response.json();
  }

  // Complete task with summary
  async completeTask(taskId, completionNotes) {
    // Add completion notes
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        text: `Task completed: ${completionNotes}`
      })
    });

    // Update status to completed
    return await this.updateTaskProgress(taskId, 'completed');
  }
}

// Usage example
const taskManager = new TaskManager(headers);

// Create task
const task = await taskManager.createAndAssignTask({
  title: "Fix authentication bug",
  description: "Users can't login with special characters in password",
  priority: "high",
  dueDate: "2024-01-20T12:00:00Z"
}, "60f7b3b3b3b3b3b3b3b3b3b3");

// Update progress
await taskManager.updateTaskProgress(task._id, 'in-progress', [
  "Started investigating the issue",
  "Found the problem in password validation regex"
]);

// Complete task
await taskManager.completeTask(task._id,
  "Fixed regex pattern to properly handle special characters. Added unit tests."
);
```

## Board Management Examples

### Creating a Complete Project Board

```javascript
const createProjectBoard = async () => {
  // 1. Create the board
  const boardData = {
    title: "Mobile App Development",
    description: "Complete mobile application development project",
    columns: [
      {
        title: "Backlog",
        position: 0,
        color: "#e74c3c",
        wipLimit: null,
        isCollapsed: false
      },
      {
        title: "Sprint Planning",
        position: 1,
        color: "#f39c12",
        wipLimit: 5,
        isCollapsed: false
      },
      {
        title: "In Development",
        position: 2,
        color: "#3498db",
        wipLimit: 3,
        isCollapsed: false
      },
      {
        title: "Code Review",
        position: 3,
        color: "#9b59b6",
        wipLimit: 2,
        isCollapsed: false
      },
      {
        title: "Testing",
        position: 4,
        color: "#e67e22",
        wipLimit: 3,
        isCollapsed: false
      },
      {
        title: "Done",
        position: 5,
        color: "#27ae60",
        wipLimit: null,
        isCollapsed: false
      }
    ],
    visibility: "team",
    settings: {
      allowGuestView: false,
      requireApprovalForJoin: true,
      defaultTaskPriority: "medium",
      enableWipLimits: true,
      autoArchiveCompleted: true,
      autoArchiveDays: 30
    },
    tags: ["mobile", "development", "iOS", "Android"],
    backgroundColor: "#ecf0f1"
  };

  const boardResponse = await fetch('/api/boards', {
    method: 'POST',
    headers,
    body: JSON.stringify(boardData)
  });

  const board = await boardResponse.json();
  console.log(`Board created: ${board.data.title}`);

  // 2. Add team members
  const teamMembers = [
    { email: "developer1@company.com", role: "admin" },
    { email: "developer2@company.com", role: "member" },
    { email: "designer@company.com", role: "member" },
    { email: "tester@company.com", role: "member" },
    { email: "stakeholder@company.com", role: "viewer" }
  ];

  for (const member of teamMembers) {
    await fetch(`/api/boards/${board.data._id}/invite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...member,
        message: `Welcome to the ${board.data.title} project board!`
      })
    });
  }

  return board.data;
};
```

### Board Task Management Workflow

```javascript
// Complete workflow for managing tasks on a board
class BoardTaskManager {
  constructor(boardId, authHeaders) {
    this.boardId = boardId;
    this.headers = authHeaders;
  }

  // Add task to specific column
  async addTaskToBoard(taskData, columnId) {
    // First create the task
    const taskResponse = await fetch('/api/tasks', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(taskData)
    });

    const task = await taskResponse.json();

    // Then move it to the board
    await fetch(`/api/boards/${this.boardId}/move-task`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        taskId: task.data._id,
        targetColumnId: columnId,
        position: 0
      })
    });

    return task.data;
  }

  // Move task through workflow
  async moveTaskToNextStage(taskId, currentColumnId, nextColumnId) {
    const response = await fetch(`/api/boards/${this.boardId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        sourceColumnId: currentColumnId,
        targetColumnId: nextColumnId,
        sourcePosition: 0, // Will be calculated by backend
        targetPosition: 0
      })
    });

    return await response.json();
  }

  // Get board analytics
  async getBoardMetrics(period = 'month') {
    const response = await fetch(`/api/analytics/board/${this.boardId}?period=${period}`, {
      method: 'GET',
      headers: this.headers
    });

    return await response.json();
  }
}

// Usage example
const boardManager = new BoardTaskManager(board._id, headers);

// Add tasks to different columns
const backlogTasks = [
  {
    title: "User Authentication",
    description: "Implement secure user login and registration",
    priority: "high",
    labels: ["auth", "security"]
  },
  {
    title: "Profile Management",
    description: "Allow users to manage their profiles",
    priority: "medium",
    labels: ["profile", "ui"]
  }
];

for (const taskData of backlogTasks) {
  await boardManager.addTaskToBoard(taskData, backlogColumnId);
}
```

## Team Collaboration Examples

### Setting Up Team Collaboration

```javascript
// Complete team setup and collaboration workflow
class TeamCollaborationManager {
  constructor(authHeaders) {
    this.headers = authHeaders;
  }

  // Create team workspace
  async createTeamWorkspace(teamName, members) {
    // 1. Create main project board
    const mainBoard = await this.createBoard({
      title: `${teamName} - Main Board`,
      description: `Primary workspace for ${teamName}`,
      visibility: "team"
    });

    // 2. Create specialized boards
    const planningBoard = await this.createBoard({
      title: `${teamName} - Sprint Planning`,
      description: "Sprint planning and backlog management",
      visibility: "team"
    });

    // 3. Invite all team members to both boards
    await this.inviteTeamMembers(mainBoard._id, members);
    await this.inviteTeamMembers(planningBoard._id, members);

    // 4. Set up recurring tasks
    await this.setupRecurringTasks(mainBoard._id);

    return { mainBoard, planningBoard };
  }

  async createBoard(boardData) {
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(boardData)
    });
    return (await response.json()).data;
  }

  async inviteTeamMembers(boardId, members) {
    for (const member of members) {
      await fetch(`/api/boards/${boardId}/invite`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: member.email,
          role: member.role,
          message: `Welcome to our team workspace! You've been added as a ${member.role}.`
        })
      });
    }
  }

  async setupRecurringTasks(boardId) {
    const recurringTasks = [
      {
        title: "Weekly Team Standup",
        description: "Weekly team synchronization meeting",
        priority: "medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isRecurring: true,
        recurrence: {
          frequency: "weekly",
          interval: 1,
          daysOfWeek: [1], // Monday
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        title: "Sprint Review",
        description: "Bi-weekly sprint review and retrospective",
        priority: "high",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isRecurring: true,
        recurrence: {
          frequency: "weekly",
          interval: 2,
          daysOfWeek: [5], // Friday
          maxOccurrences: 26 // One year of bi-weekly meetings
        }
      }
    ];

    for (const task of recurringTasks) {
      await fetch('/api/tasks/recurring', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          ...task,
          boardId
        })
      });
    }
  }

  // Generate sharing link for external stakeholders
  async createStakeholderAccess(boardId, expirationDays = 30) {
    const response = await fetch(`/api/boards/${boardId}/sharing-link`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        role: "viewer",
        expiresIn: expirationDays * 24 * 60 * 60 * 1000
      })
    });

    const result = await response.json();
    console.log(`Stakeholder access link: ${result.data.link}`);
    return result.data;
  }
}

// Usage
const teamManager = new TeamCollaborationManager(headers);

const teamMembers = [
  { email: "lead@company.com", role: "admin" },
  { email: "dev1@company.com", role: "member" },
  { email: "dev2@company.com", role: "member" },
  { email: "designer@company.com", role: "member" },
  { email: "pm@company.com", role: "admin" }
];

const workspace = await teamManager.createTeamWorkspace("Frontend Team", teamMembers);
const stakeholderLink = await teamManager.createStakeholderAccess(workspace.mainBoard._id, 60);
```

## Analytics and Reporting

### Comprehensive Analytics Dashboard

```javascript
// Analytics dashboard for managers and team leads
class AnalyticsDashboard {
  constructor(authHeaders) {
    this.headers = authHeaders;
  }

  // Get complete dashboard overview
  async getDashboardOverview(period = 'month') {
    const [userAnalytics, teamAnalytics, productivityInsights] = await Promise.all([
      this.getUserAnalytics(period),
      this.getTeamAnalytics(period),
      this.getProductivityInsights(period)
    ]);

    return {
      user: userAnalytics.data,
      team: teamAnalytics.data,
      productivity: productivityInsights.data,
      generatedAt: new Date().toISOString()
    };
  }

  async getUserAnalytics(period) {
    const response = await fetch(`/api/analytics/user?period=${period}`, {
      method: 'GET',
      headers: this.headers
    });
    return await response.json();
  }

  async getTeamAnalytics(period) {
    const response = await fetch(`/api/analytics/team?period=${period}`, {
      method: 'GET',
      headers: this.headers
    });
    return await response.json();
  }

  async getProductivityInsights(period) {
    const response = await fetch(`/api/analytics/productivity?period=${period}`, {
      method: 'GET',
      headers: this.headers
    });
    return await response.json();
  }

  // Get board-specific analytics
  async getBoardAnalytics(boardId, period = 'month') {
    const response = await fetch(`/api/analytics/board/${boardId}?period=${period}`, {
      method: 'GET',
      headers: this.headers
    });
    return await response.json();
  }

  // Export analytics data
  async exportAnalytics(type = 'user', format = 'json', period = 'month') {
    const response = await fetch(`/api/analytics/export?type=${type}&format=${format}&period=${period}`, {
      method: 'GET',
      headers: this.headers
    });

    if (format === 'csv') {
      return await response.text();
    }
    return await response.json();
  }

  // Generate productivity report
  async generateProductivityReport(boardIds = []) {
    const reports = [];

    // Get individual board analytics
    for (const boardId of boardIds) {
      const boardAnalytics = await this.getBoardAnalytics(boardId);
      reports.push(boardAnalytics.data);
    }

    // Get team overview
    const teamOverview = await this.getTeamAnalytics('quarter');

    return {
      boardReports: reports,
      teamOverview: teamOverview.data,
      summary: this.calculateSummaryMetrics(reports),
      recommendations: this.generateRecommendations(reports)
    };
  }

  calculateSummaryMetrics(reports) {
    const totalTasks = reports.reduce((sum, report) => sum + (report.overview?.total || 0), 0);
    const avgCompletionRate = reports.reduce((sum, report) => {
      const completed = report.overview?.byStatus?.completed || 0;
      const total = report.overview?.total || 1;
      return sum + (completed / total);
    }, 0) / reports.length;

    return {
      totalTasks,
      avgCompletionRate: Math.round(avgCompletionRate * 100),
      boardCount: reports.length
    };
  }

  generateRecommendations(reports) {
    const recommendations = [];

    reports.forEach((report, index) => {
      const completionRate = report.overview?.byStatus?.completed / report.overview?.total || 0;

      if (completionRate < 0.7) {
        recommendations.push({
          boardId: report.board?.id,
          type: "productivity",
          priority: "high",
          message: `Board ${index + 1} has low completion rate (${Math.round(completionRate * 100)}%). Consider reviewing task distribution and deadlines.`
        });
      }

      // Check for workflow bottlenecks
      if (report.workflow) {
        const maxUtilization = Math.max(...report.workflow.map(col => col.utilizationRate || 0));
        if (maxUtilization > 90) {
          recommendations.push({
            boardId: report.board?.id,
            type: "workflow",
            priority: "medium",
            message: `Board ${index + 1} has workflow bottlenecks. Consider increasing WIP limits or redistributing tasks.`
          });
        }
      }
    });

    return recommendations;
  }
}

// Usage example
const analytics = new AnalyticsDashboard(headers);

// Get dashboard overview
const dashboardData = await analytics.getDashboardOverview('month');
console.log('Dashboard Overview:', dashboardData);

// Generate comprehensive report
const boardIds = ['60f7b3b3b3b3b3b3b3b3b3b3', '60f7b3b3b3b3b3b3b3b3b3b4'];
const productivityReport = await analytics.generateProductivityReport(boardIds);
console.log('Productivity Report:', productivityReport);

// Export data for external analysis
const csvData = await analytics.exportAnalytics('team', 'csv', 'quarter');
console.log('CSV Export:', csvData);
```

## Integration Scenarios

### Webhook Integration Example

```javascript
// Example webhook handler for external integrations
class WebhookHandler {
  constructor(taskManagerApiUrl, authToken) {
    this.apiUrl = taskManagerApiUrl;
    this.headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Handle GitHub webhook for issue creation
  async handleGitHubIssue(githubPayload) {
    const issue = githubPayload.issue;

    const taskData = {
      title: `GitHub Issue: ${issue.title}`,
      description: `${issue.body}\n\nGitHub URL: ${issue.html_url}`,
      priority: this.mapGitHubPriorityToTask(issue.labels),
      labels: ['github', 'external', ...issue.labels.map(label => label.name)],
      assignedTo: await this.findUserByGitHubUsername(issue.assignee?.login),
      attachments: [issue.html_url]
    };

    const response = await fetch(`${this.apiUrl}/api/tasks`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(taskData)
    });

    return await response.json();
  }

  // Handle Slack slash command
  async handleSlackCommand(slackPayload) {
    const { text, user_name, channel_name } = slackPayload;
    const [command, ...args] = text.split(' ');

    switch (command) {
      case 'create':
        return await this.createTaskFromSlack(args.join(' '), user_name);
      case 'list':
        return await this.listTasksForSlack(user_name);
      case 'complete':
        return await this.completeTaskFromSlack(args[0], user_name);
      default:
        return { text: 'Unknown command. Use: create, list, or complete' };
    }
  }

  async createTaskFromSlack(taskTitle, slackUsername) {
    const userId = await this.findUserBySlackUsername(slackUsername);

    const taskData = {
      title: taskTitle,
      description: `Created from Slack by ${slackUsername}`,
      priority: 'medium',
      labels: ['slack', 'quick-add'],
      assignedTo: userId
    };

    const response = await fetch(`${this.apiUrl}/api/tasks`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(taskData)
    });

    const result = await response.json();
    return {
      text: `Task created: ${result.data.title}`,
      response_type: 'ephemeral'
    };
  }

  // Sync with external calendar
  async syncWithCalendar(calendarEvents) {
    for (const event of calendarEvents) {
      if (event.title.includes('[TASK]')) {
        const taskData = {
          title: event.title.replace('[TASK]', '').trim(),
          description: event.description || '',
          dueDate: event.end,
          priority: 'medium',
          labels: ['calendar', 'meeting']
        };

        await fetch(`${this.apiUrl}/api/tasks`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(taskData)
        });
      }
    }
  }

  // Helper methods
  mapGitHubPriorityToTask(labels) {
    const priorityLabels = ['critical', 'high', 'medium', 'low'];
    const foundPriority = labels.find(label =>
      priorityLabels.includes(label.name.toLowerCase())
    );
    return foundPriority ? foundPriority.name.toLowerCase() : 'medium';
  }

  async findUserByGitHubUsername(githubUsername) {
    // Implementation would depend on your user mapping strategy
    return null; // Return user ID if found
  }

  async findUserBySlackUsername(slackUsername) {
    // Implementation would depend on your user mapping strategy
    return null; // Return user ID if found
  }
}
```

### Automated Workflow Example

```javascript
// Automated workflow for continuous integration
class AutomatedWorkflow {
  constructor(authHeaders) {
    this.headers = authHeaders;
  }

  // CI/CD pipeline integration
  async handleDeploymentComplete(deploymentInfo) {
    const { environment, version, success, boardId } = deploymentInfo;

    if (success) {
      // Move all tasks in "Ready for Deploy" to "Deployed"
      await this.moveTasksByStatus(boardId, 'ready-for-deploy', 'deployed');

      // Create release notes task
      await this.createReleaseNotesTask(boardId, version, environment);
    } else {
      // Create hotfix task for failed deployment
      await this.createHotfixTask(boardId, deploymentInfo.error);
    }
  }

  async moveTasksByStatus(boardId, fromColumn, toColumn) {
    // Get board details
    const boardResponse = await fetch(`/api/boards/${boardId}`, {
      method: 'GET',
      headers: this.headers
    });
    const board = await boardResponse.json();

    // Find column IDs
    const fromColumnId = board.data.columns.find(col =>
      col.title.toLowerCase().includes(fromColumn)
    )?._id;

    const toColumnId = board.data.columns.find(col =>
      col.title.toLowerCase().includes(toColumn)
    )?._id;

    if (!fromColumnId || !toColumnId) return;

    // Get tasks in source column
    const tasksResponse = await fetch(`/api/tasks?boardId=${boardId}&columnId=${fromColumnId}`, {
      method: 'GET',
      headers: this.headers
    });
    const tasks = await tasksResponse.json();

    // Move each task
    for (const task of tasks.data) {
      await fetch(`/api/boards/${boardId}/tasks/${task._id}/move`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          sourceColumnId: fromColumnId,
          targetColumnId: toColumnId,
          sourcePosition: 0,
          targetPosition: 0
        })
      });
    }
  }

  async createReleaseNotesTask(boardId, version, environment) {
    const taskData = {
      title: `Update Release Notes - ${version}`,
      description: `Update release notes for version ${version} deployed to ${environment}`,
      priority: 'medium',
      labels: ['release', 'documentation', environment],
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Due tomorrow
    };

    await fetch('/api/tasks', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(taskData)
    });
  }

  async createHotfixTask(boardId, error) {
    const taskData = {
      title: `HOTFIX: Deployment Failed`,
      description: `Deployment failed with error: ${error}\n\nImmediate attention required.`,
      priority: 'high',
      labels: ['hotfix', 'urgent', 'deployment'],
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Due in 2 hours
    };

    await fetch('/api/tasks', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(taskData)
    });
  }
}
```

## Error Handling and Best Practices

### Robust Error Handling

```javascript
class TaskManagerClient {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async handleApiError(response) {
    const errorData = await response.json().catch(() => ({}));

    switch (response.status) {
      case 401:
        // Token expired, try to refresh
        await this.refreshToken();
        throw new Error('Token refreshed, please retry request');

      case 403:
        throw new Error(`Access denied: ${errorData.error || 'Insufficient permissions'}`);

      case 404:
        throw new Error(`Resource not found: ${errorData.error || 'The requested resource does not exist'}`);

      case 429:
        throw new Error('Rate limit exceeded. Please try again later.');

      case 500:
        throw new Error(`Server error: ${errorData.error || 'Internal server error'}`);

      default:
        throw new Error(`API Error: ${errorData.error || 'Unknown error occurred'}`);
    }
  }

  async refreshToken() {
    // Implementation for token refresh
    const refreshResponse = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();
      this.authToken = accessToken;
    }
  }

  // Wrapper methods with error handling
  async createTask(taskData) {
    return await this.makeRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(taskId, updates) {
    return await this.makeRequest(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTask(taskId) {
    return await this.makeRequest(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }
}

// Usage with error handling
const client = new TaskManagerClient('http://localhost:5000', accessToken);

try {
  const task = await client.createTask({
    title: "Test task",
    description: "This is a test task"
  });
  console.log('Task created successfully:', task);
} catch (error) {
  console.error('Failed to create task:', error.message);
  // Handle error appropriately in your application
}
```

---

These examples demonstrate real-world usage patterns for the Task Manager API. Each example includes proper error handling, authentication, and follows REST API best practices. Use these as starting points for integrating the API into your applications.