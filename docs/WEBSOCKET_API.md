# WebSocket API Documentation - Task Manager API

## Overview

The Task Manager API provides real-time WebSocket functionality using Socket.IO for instant updates and collaboration features. This enables live synchronization across multiple clients for tasks, boards, and notifications.

## 🔌 Connection

### Endpoint
```
ws://localhost:3000
```

### Authentication
WebSocket connections require JWT authentication via one of these methods:

#### Method 1: Auth Object
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Method 2: Authorization Header
```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

### Connection Events

#### Connected
Emitted when successfully connected to the server.
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // data: { message, userId, timestamp }
});
```

#### Connection Error
```javascript
socket.on('connect_error', (error) => {
  console.log('Connection failed:', error.message);
});
```

## 📋 Room Management

### Joining Rooms

#### Join Board Room
Subscribe to updates for a specific board:
```javascript
socket.emit('join_board', 'board-id-here');
```

#### Join Task Room
Subscribe to updates for a specific task:
```javascript
socket.emit('join_task', 'task-id-here');
```

### Leaving Rooms

#### Leave Board Room
```javascript
socket.emit('leave_board', 'board-id-here');
```

#### Leave Task Room
```javascript
socket.emit('leave_task', 'task-id-here');
```

## 📝 Task Events

### Listening for Task Updates

#### Task Created
```javascript
socket.on('task_updated', (event) => {
  if (event.type === 'task_created') {
    console.log('New task created:', event.task);
  }
});
```

#### Task Updated
```javascript
socket.on('task_updated', (event) => {
  if (event.type === 'task_updated') {
    console.log('Task updated:', event.task);
    console.log('Changes:', event.changes);
    console.log('Previous values:', event.previousValues);
  }
});
```

#### Task Status Updated
```javascript
socket.on('task_updated', (event) => {
  if (event.type === 'task_status_updated') {
    console.log('Task status changed:', event.statusChange);
    // statusChange: { from: 'pending', to: 'completed' }
  }
});
```

#### Task Deleted
```javascript
socket.on('task_updated', (event) => {
  if (event.type === 'task_deleted') {
    console.log('Task deleted:', event.taskId);
  }
});
```

#### Comment Added
```javascript
socket.on('task_updated', (event) => {
  if (event.type === 'comment_added') {
    console.log('New comment:', event.comment);
    console.log('Updated task:', event.task);
  }
});
```

### Task Event Structure
```javascript
{
  taskId: "string",
  update: {
    type: "task_created|task_updated|task_status_updated|task_deleted|comment_added",
    task: Object,           // Full task object (when available)
    changes: Object,        // Changes made (for updates)
    previousValues: Object, // Previous values (for updates)
    statusChange: Object,   // Status change info (for status updates)
    comment: Object         // Comment info (for comment additions)
  },
  updatedBy: "user-id",
  timestamp: "ISO-date-string"
}
```

## 📊 Board Events

### Listening for Board Updates

#### Board Created
```javascript
socket.on('board_updated', (event) => {
  if (event.type === 'board_created') {
    console.log('New board created:', event.board);
  }
});
```

#### Task Added to Board
```javascript
socket.on('board_updated', (event) => {
  if (event.type === 'task_added') {
    console.log('Task added to board:', event.taskId);
  }
});
```

#### Task Removed from Board
```javascript
socket.on('board_updated', (event) => {
  if (event.type === 'task_removed') {
    console.log('Task removed from board:', event.taskId);
  }
});
```

#### Column Added
```javascript
socket.on('board_updated', (event) => {
  if (event.type === 'column_added') {
    console.log('Column added:', event.column);
  }
});
```

#### Column Removed
```javascript
socket.on('board_updated', (event) => {
  if (event.type === 'column_removed') {
    console.log('Column removed:', event.columnId);
  }
});
```

### Board Event Structure
```javascript
{
  boardId: "string",
  update: {
    type: "board_created|task_added|task_removed|task_updated|column_added|column_removed",
    board: Object,     // Board object (when available)
    task: Object,      // Task object (for task events)
    taskId: "string",  // Task ID (for task events)
    column: Object,    // Column object (for column additions)
    columnId: "string", // Column ID (for column removals)
    changes: Object    // Changes made (for updates)
  },
  updatedBy: "user-id",
  timestamp: "ISO-date-string"
}
```

## 🔔 Notification Events

### Real-time Notifications
```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);

  // Show notification to user
  showNotification(notification.title, notification.message);
});
```

### Notification Structure
```javascript
{
  id: "notification-id",
  type: "string",
  title: "string",
  message: "string",
  relatedTask: "task-id",
  relatedUser: "user-id",
  createdAt: "ISO-date-string",
  deliveredAt: "ISO-date-string",
  timestamp: "ISO-date-string"
}
```

## 👥 User Interaction Events

### Typing Indicators

#### Start Typing
```javascript
socket.emit('typing_start', {
  taskId: 'task-id-here',
  field: 'description' // or 'comment'
});
```

#### Stop Typing
```javascript
socket.emit('typing_stop', {
  taskId: 'task-id-here',
  field: 'description'
});
```

#### Listen for Typing
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.userName} is typing in ${data.field}`);
  // data: { userId, userName, taskId, field }
});

socket.on('user_stopped_typing', (data) => {
  console.log(`${data.userId} stopped typing`);
  // data: { userId, taskId, field }
});
```

## 📢 System Events

### Global Activity Feed
```javascript
socket.on('global_activity', (activity) => {
  console.log('Global activity:', activity);
});
```

### Board-specific Activity
```javascript
socket.on('activity_update', (activity) => {
  console.log('Board activity:', activity);
});
```

### System Announcements
```javascript
socket.on('system_announcement', (announcement) => {
  console.log('System announcement:', announcement);
});
```

## 🔧 Client Implementation Examples

### React.js Example
```javascript
import { io } from 'socket.io-client';

class TaskManagerSocket {
  constructor(token) {
    this.socket = io('http://localhost:3000', {
      auth: { token }
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connected', (data) => {
      console.log('Connected to WebSocket:', data);
    });

    this.socket.on('task_updated', (event) => {
      this.handleTaskUpdate(event);
    });

    this.socket.on('board_updated', (event) => {
      this.handleBoardUpdate(event);
    });

    this.socket.on('notification', (notification) => {
      this.handleNotification(notification);
    });
  }

  joinBoard(boardId) {
    this.socket.emit('join_board', boardId);
  }

  joinTask(taskId) {
    this.socket.emit('join_task', taskId);
  }

  startTyping(taskId, field) {
    this.socket.emit('typing_start', { taskId, field });
  }

  stopTyping(taskId, field) {
    this.socket.emit('typing_stop', { taskId, field });
  }

  handleTaskUpdate(event) {
    // Update UI based on task changes
    switch (event.update.type) {
      case 'task_created':
        this.addTaskToUI(event.update.task);
        break;
      case 'task_updated':
        this.updateTaskInUI(event.update.task, event.update.changes);
        break;
      case 'task_status_updated':
        this.updateTaskStatus(event.taskId, event.update.statusChange);
        break;
      case 'task_deleted':
        this.removeTaskFromUI(event.taskId);
        break;
      case 'comment_added':
        this.addCommentToTask(event.taskId, event.update.comment);
        break;
    }
  }

  handleBoardUpdate(event) {
    // Update board UI based on changes
    switch (event.update.type) {
      case 'board_created':
        this.addBoardToUI(event.update.board);
        break;
      case 'task_added':
        this.addTaskToBoard(event.boardId, event.update.taskId);
        break;
      case 'task_removed':
        this.removeTaskFromBoard(event.boardId, event.update.taskId);
        break;
      case 'column_added':
        this.addColumnToBoard(event.boardId, event.update.column);
        break;
      case 'column_removed':
        this.removeColumnFromBoard(event.boardId, event.update.columnId);
        break;
    }
  }

  handleNotification(notification) {
    // Show notification to user
    this.showToast(notification.title, notification.message);

    // Update notification count
    this.incrementNotificationCount();

    // Add to notification list
    this.addNotificationToList(notification);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const token = localStorage.getItem('authToken');
const taskSocket = new TaskManagerSocket(token);

// Join a board when viewing it
taskSocket.joinBoard('board-id-123');

// Join a task when editing it
taskSocket.joinTask('task-id-456');
```

### Vue.js Example
```javascript
// composables/useWebSocket.js
import { io } from 'socket.io-client';
import { ref, onMounted, onUnmounted } from 'vue';

export function useWebSocket(token) {
  const socket = ref(null);
  const connected = ref(false);
  const notifications = ref([]);

  onMounted(() => {
    socket.value = io('http://localhost:3000', {
      auth: { token }
    });

    socket.value.on('connect', () => {
      connected.value = true;
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });

    socket.value.on('notification', (notification) => {
      notifications.value.unshift(notification);
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
    }
  });

  return {
    socket,
    connected,
    notifications,
    joinBoard: (boardId) => socket.value?.emit('join_board', boardId),
    joinTask: (taskId) => socket.value?.emit('join_task', taskId),
    startTyping: (taskId, field) => socket.value?.emit('typing_start', { taskId, field }),
    stopTyping: (taskId, field) => socket.value?.emit('typing_stop', { taskId, field })
  };
}
```

## 📱 Mobile Implementation

### React Native Example
```javascript
import io from 'socket.io-client';

class MobileTaskSocket {
  constructor(token) {
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupMobileListeners();
  }

  setupMobileListeners() {
    this.socket.on('notification', (notification) => {
      // Show push notification even when app is in background
      this.showPushNotification(notification);
    });

    this.socket.on('task_updated', (event) => {
      // Update local cache/state
      this.updateLocalTaskCache(event);
    });
  }

  showPushNotification(notification) {
    // Use react-native-push-notification or similar
    PushNotification.localNotification({
      title: notification.title,
      message: notification.message,
      data: { notificationId: notification.id }
    });
  }

  updateLocalTaskCache(event) {
    // Update AsyncStorage or Redux store
    // This ensures UI stays in sync even when switching between screens
  }
}
```

## 🔒 Security Considerations

### Authentication
- All WebSocket connections require valid JWT tokens
- Invalid or expired tokens will result in connection rejection
- Tokens are validated on each connection attempt

### Authorization
- Users can only join rooms for boards/tasks they have access to
- Real-time events are only sent to authorized users
- User permissions are checked server-side before emitting events

### Rate Limiting
- Typing events are throttled to prevent spam
- Connection attempts are rate-limited per IP
- Event emissions have built-in throttling

## 🚀 Performance Optimization

### Connection Management
- Connections are automatically cleaned up on disconnect
- User mappings are efficiently maintained in memory
- Room subscriptions are properly managed

### Event Optimization
- Events are only sent to users who need them
- Large payloads are minimized where possible
- Batch updates are used for multiple rapid changes

### Scalability
- The WebSocket service is designed to work with multiple server instances
- Connection state can be shared via Redis (future enhancement)
- Room management scales with user growth

## 🐛 Error Handling

### Connection Errors
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);

  if (error.message.includes('Authentication')) {
    // Redirect to login
    redirectToLogin();
  } else {
    // Show retry option
    showRetryDialog();
  }
});
```

### Reconnection
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');

  // Rejoin previously subscribed rooms
  rejoinRooms();
});

socket.on('reconnect_failed', () => {
  console.log('Failed to reconnect');
  showOfflineMode();
});
```

## 📊 Monitoring and Analytics

### Connection Metrics
The WebSocket service provides methods to monitor:
- Number of connected users
- Users in specific rooms
- Connection health status

### Event Tracking
- All events are logged for debugging
- Performance metrics are tracked
- Error rates are monitored

This WebSocket API enables real-time collaboration and instant updates across all connected clients, providing a seamless and responsive user experience for the Task Manager application.