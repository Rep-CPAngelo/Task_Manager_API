'use strict';

const taskService = require('../../services/taskService');
const Task = require('../../models/Task');
const TaskActivity = require('../../models/TaskActivity');

jest.mock('../../models/Task');
jest.mock('../../models/TaskActivity');

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        createdBy: 'user123'
      };

      const mockTask = {
        _id: 'task123',
        ...taskData,
        save: jest.fn().mockResolvedValue(true)
      };

      Task.create = jest.fn().mockResolvedValue(mockTask);
      taskService.createActivity = jest.fn().mockResolvedValue(true);

      const result = await taskService.createTask(taskData);

      expect(Task.create).toHaveBeenCalledWith(taskData);
      expect(taskService.createActivity).toHaveBeenCalledWith(mockTask._id, taskData.createdBy, 'task_created', { title: taskData.title });
      expect(result).toBe(mockTask);
    });

    it('should throw error if task creation fails', async () => {
      const taskData = {
        title: 'Test Task',
        createdBy: 'user123'
      };

      Task.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(taskService.createTask(taskData)).rejects.toThrow('Database error');
    });
  });

  describe('getTasks', () => {
    it('should return paginated tasks with filters', async () => {
      const mockTasks = [
        { _id: 'task1', title: 'Task 1' },
        { _id: 'task2', title: 'Task 2' }
      ];

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks)
      };

      Task.find = jest.fn().mockReturnValue(mockQuery);
      Task.countDocuments = jest.fn().mockResolvedValue(10);

      const filter = { status: 'pending' };
      const options = { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' };

      const result = await taskService.getTasks(filter, options);

      expect(Task.find).toHaveBeenCalledWith(filter);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.tasks).toEqual(mockTasks);
      expect(result.pagination).toEqual({
        current: 1,
        limit: 5,
        total: 10,
        pages: 2
      });
    });
  });

  describe('getTaskById', () => {
    it('should return task by ID', async () => {
      const mockTask = {
        _id: 'task123',
        title: 'Test Task'
      };

      Task.findById = jest.fn().mockResolvedValue(mockTask);

      const result = await taskService.getTaskById('task123');

      expect(Task.findById).toHaveBeenCalledWith('task123');
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found', async () => {
      Task.findById = jest.fn().mockResolvedValue(null);

      const result = await taskService.getTaskById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('hasTaskPermission', () => {
    const mockTask = {
      createdBy: 'creator123',
      assignedTo: 'assignee456'
    };

    it('should allow admin access', () => {
      const user = { role: 'admin', id: 'admin123' };

      const result = taskService.hasTaskPermission(mockTask, user);

      expect(result).toBe(true);
    });

    it('should allow creator access', () => {
      const user = { role: 'user', id: 'creator123' };

      const result = taskService.hasTaskPermission(mockTask, user);

      expect(result).toBe(true);
    });

    it('should allow assignee access', () => {
      const user = { role: 'user', id: 'assignee456' };

      const result = taskService.hasTaskPermission(mockTask, user);

      expect(result).toBe(true);
    });

    it('should deny access for other users', () => {
      const user = { role: 'user', id: 'other789' };

      const result = taskService.hasTaskPermission(mockTask, user);

      expect(result).toBe(false);
    });

    it('should require owner for delete operation', () => {
      const user = { role: 'user', id: 'assignee456' };

      const result = taskService.hasTaskPermission(mockTask, user, true);

      expect(result).toBe(false);
    });

    it('should allow owner for delete operation', () => {
      const user = { role: 'user', id: 'creator123' };

      const result = taskService.hasTaskPermission(mockTask, user, true);

      expect(result).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('should update task and log activity', async () => {
      const mockTask = {
        _id: 'task123',
        title: 'Old Title',
        status: 'pending',
        priority: 'medium',
        save: jest.fn().mockResolvedValue(true)
      };

      Task.findById = jest.fn().mockResolvedValue(mockTask);
      taskService.createActivity = jest.fn().mockResolvedValue(true);

      const updates = { title: 'New Title' };
      const userId = 'user123';

      const result = await taskService.updateTask('task123', updates, userId);

      expect(mockTask.title).toBe('New Title');
      expect(mockTask.save).toHaveBeenCalled();
      expect(taskService.createActivity).toHaveBeenCalledWith('task123', userId, 'task_updated', {
        updates,
        before: { status: 'pending', priority: 'medium' }
      });
    });
  });

  describe('buildTaskFilter', () => {
    const mockUser = { id: 'user123', role: 'user' };

    it('should build basic filter for regular user', () => {
      const query = {};

      const result = taskService.buildTaskFilter(query, mockUser);

      expect(result).toEqual({
        isDeleted: false,
        $or: [
          { createdBy: 'user123' },
          { assignedTo: 'user123' }
        ]
      });
    });

    it('should build filter with status for admin', () => {
      const adminUser = { id: 'admin123', role: 'admin' };
      const query = { status: 'pending' };

      const result = taskService.buildTaskFilter(query, adminUser);

      expect(result).toEqual({
        isDeleted: false,
        status: 'pending'
      });
    });

    it('should include assignedTo filter', () => {
      const query = { assignedTo: 'someone' };

      const result = taskService.buildTaskFilter(query, mockUser);

      expect(result.assignedTo).toBe('someone');
    });

    it('should include priority filter', () => {
      const query = { priority: 'high' };

      const result = taskService.buildTaskFilter(query, mockUser);

      expect(result.priority).toBe('high');
    });
  });
});