'use strict';

const recurringTaskService = require('../../services/recurringTaskService');
const Task = require('../../models/Task');
const TaskActivity = require('../../models/TaskActivity');

jest.mock('../../models/Task');
jest.mock('../../models/TaskActivity');

describe('RecurringTaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNextDueDate', () => {
    it('should calculate next due date for daily frequency', () => {
      const recurrence = { frequency: 'daily', interval: 2 };
      const currentDate = new Date('2024-01-01T10:00:00Z');

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toEqual(new Date('2024-01-03T10:00:00Z'));
    });

    it('should calculate next due date for weekly frequency', () => {
      const recurrence = { frequency: 'weekly', interval: 1 };
      const currentDate = new Date('2024-01-01T10:00:00Z'); // Monday

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toEqual(new Date('2024-01-08T10:00:00Z'));
    });

    it('should calculate next due date for monthly frequency', () => {
      const recurrence = { frequency: 'monthly', interval: 1 };
      const currentDate = new Date('2024-01-15T10:00:00Z');

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toEqual(new Date('2024-02-15T10:00:00Z'));
    });

    it('should calculate next due date for yearly frequency', () => {
      const recurrence = { frequency: 'yearly', interval: 1 };
      const currentDate = new Date('2024-01-15T10:00:00Z');

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('should handle interval greater than 1', () => {
      const recurrence = { frequency: 'weekly', interval: 3 };
      const currentDate = new Date('2024-01-01T10:00:00Z');

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toEqual(new Date('2024-01-22T10:00:00Z')); // 3 weeks later
    });

    it('should return null for invalid frequency', () => {
      const recurrence = { frequency: 'invalid', interval: 1 };
      const currentDate = new Date('2024-01-01T10:00:00Z');

      const result = recurringTaskService.calculateNextDueDate(recurrence, currentDate);

      expect(result).toBeNull();
    });
  });

  describe('createRecurringTask', () => {
    it('should create recurring task successfully', async () => {
      const taskData = {
        title: 'Daily Standup',
        description: 'Team standup meeting',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          maxOccurrences: 10
        },
        dueDate: new Date('2024-01-01T09:00:00Z'),
        createdBy: 'user123',
        isRecurring: true
      };

      const mockTask = {
        _id: 'recurring123',
        ...taskData,
        isRecurring: true,
        nextDueDate: new Date('2024-01-02T09:00:00Z'),
        save: jest.fn().mockResolvedValue(true)
      };

      Task.mockImplementation(() => mockTask);

      const result = await recurringTaskService.createRecurringTask(taskData);

      expect(Task).toHaveBeenCalledWith({
        ...taskData,
        isRecurring: true,
        nextDueDate: new Date('2024-01-02T09:00:00Z')
      });
      expect(mockTask.save).toHaveBeenCalled();
      expect(result).toBe(mockTask);
    });

    it('should handle task without maxOccurrences', async () => {
      const taskData = {
        title: 'Weekly Report',
        recurrence: {
          frequency: 'weekly',
          interval: 1
        },
        dueDate: new Date('2024-01-01T09:00:00Z'),
        createdBy: 'user123',
        isRecurring: true
      };

      const mockTask = {
        save: jest.fn().mockResolvedValue(true)
      };

      Task.mockImplementation(() => mockTask);

      await recurringTaskService.createRecurringTask(taskData);

      expect(Task).toHaveBeenCalledWith({
        ...taskData,
        isRecurring: true,
        nextDueDate: new Date('2024-01-08T09:00:00Z')
      });
    });
  });

  describe('updateRecurringTask', () => {
    it('should update recurring task and recalculate next due date', async () => {
      const taskId = 'recurring123';
      const updates = {
        recurrence: {
          frequency: 'weekly',
          interval: 2
        }
      };

      const mockTask = {
        _id: taskId,
        dueDate: new Date('2024-01-01T09:00:00Z'),
        isRecurring: true,
        recurrence: {
          frequency: 'daily',
          interval: 1
        },
        save: jest.fn().mockResolvedValue(true)
      };

      Task.findById = jest.fn().mockResolvedValue(mockTask);

      const result = await recurringTaskService.updateRecurringTask(taskId, updates);

      expect(Task.findById).toHaveBeenCalledWith(taskId);
      expect(mockTask.recurrence).toEqual(updates.recurrence);
      expect(mockTask.nextDueDate).toEqual(new Date('2024-01-15T09:00:00Z')); // 2 weeks later
      expect(mockTask.save).toHaveBeenCalled();
      expect(result).toBe(mockTask);
    });

    it('should throw error if task not found', async () => {
      const taskId = 'nonexistent';
      const updates = { recurrence: { frequency: 'weekly' } };

      Task.findById = jest.fn().mockResolvedValue(null);

      await expect(recurringTaskService.updateRecurringTask(taskId, updates))
        .rejects.toThrow('Task not found');
    });
  });

  describe('generateDueRecurringTasks', () => {
    it('should generate tasks for due recurring tasks', async () => {
      const mockRecurringTasks = [
        {
          _id: 'recurring1',
          title: 'Daily Task',
          description: 'Task description',
          recurrence: {
            frequency: 'daily',
            interval: 1,
            maxOccurrences: 5
          },
          nextDueDate: new Date('2024-01-01T09:00:00Z'),
          occurrenceCount: 2,
          createdBy: 'user123',
          assignedTo: 'user456',
          priority: 'medium',
          labels: ['work'],
          subtasks: [],
          attachments: [],
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      const mockCreatedTask = {
        _id: 'task123',
        save: jest.fn().mockResolvedValue(true)
      };

      Task.find = jest.fn().mockResolvedValue(mockRecurringTasks);
      Task.mockImplementation(() => mockCreatedTask);
      TaskActivity.create = jest.fn().mockResolvedValue(true);

      const result = await recurringTaskService.generateDueRecurringTasks();

      expect(Task.find).toHaveBeenCalledWith({
        isRecurring: true,
        isDeleted: false,
        nextDueDate: { $lte: expect.any(Date) },
        $expr: { $lt: ['$occurrenceCount', '$recurrence.maxOccurrences'] }
      });

      expect(Task).toHaveBeenCalledWith({
        title: 'Daily Task',
        description: 'Task description',
        dueDate: new Date('2024-01-01T09:00:00Z'),
        createdBy: 'user123',
        assignedTo: 'user456',
        priority: 'medium',
        labels: ['work'],
        parentTask: 'recurring1',
        isRecurring: false
      });

      expect(mockCreatedTask.save).toHaveBeenCalled();
      expect(mockRecurringTasks[0].occurrenceCount).toBe(3);
      expect(mockRecurringTasks[0].nextDueDate).toEqual(new Date('2024-01-02T09:00:00Z'));
      expect(mockRecurringTasks[0].save).toHaveBeenCalled();

      expect(TaskActivity.create).toHaveBeenCalledWith({
        task: 'task123',
        user: 'user123',
        action: 'generated_from_recurring',
        details: {
          parentTask: 'recurring1',
          occurrenceNumber: 3
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockCreatedTask);
    });

    it('should skip tasks that have reached max occurrences', async () => {
      const mockRecurringTasks = [
        {
          _id: 'recurring1',
          recurrence: {
            frequency: 'daily',
            interval: 1,
            maxOccurrences: 3
          },
          occurrenceCount: 3,
          save: jest.fn()
        }
      ];

      Task.find = jest.fn().mockResolvedValue(mockRecurringTasks);

      const result = await recurringTaskService.generateDueRecurringTasks();

      expect(result).toHaveLength(0);
      expect(mockRecurringTasks[0].save).not.toHaveBeenCalled();
    });

    it('should handle tasks without maxOccurrences', async () => {
      const mockRecurringTasks = [
        {
          _id: 'recurring1',
          title: 'Unlimited Task',
          recurrence: {
            frequency: 'weekly',
            interval: 1
          },
          nextDueDate: new Date('2024-01-01T09:00:00Z'),
          occurrenceCount: 10,
          createdBy: 'user123',
          subtasks: [],
          attachments: [],
          labels: [],
          save: jest.fn().mockResolvedValue(true)
        }
      ];

      const mockCreatedTask = {
        save: jest.fn().mockResolvedValue(true)
      };

      Task.find = jest.fn().mockResolvedValue(mockRecurringTasks);
      Task.mockImplementation(() => mockCreatedTask);
      TaskActivity.create = jest.fn().mockResolvedValue(true);

      const result = await recurringTaskService.generateDueRecurringTasks();

      expect(result).toHaveLength(1);
      expect(mockRecurringTasks[0].occurrenceCount).toBe(11);
    });
  });

  describe('getTaskInstances', () => {
    it('should return paginated task instances', async () => {
      const parentTaskId = 'recurring123';
      const query = { page: 1, limit: 10 };

      const mockTasks = [
        { _id: 'instance1', parentTask: parentTaskId },
        { _id: 'instance2', parentTask: parentTaskId }
      ];

      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTasks)
      };

      Task.find = jest.fn().mockReturnValue(mockQueryChain);
      Task.countDocuments = jest.fn().mockResolvedValue(15);

      const result = await recurringTaskService.getTaskInstances(parentTaskId, query);

      expect(Task.find).toHaveBeenCalledWith({
        parentTask: parentTaskId,
        isDeleted: false
      });

      expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(result.instances).toBe(mockTasks);
      expect(result.pagination).toEqual({
        current: 1,
        limit: 10,
        total: 15,
        pages: 2
      });
    });

    it('should handle custom pagination parameters', async () => {
      const parentTaskId = 'recurring123';
      const query = { page: 3, limit: 5 };

      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Task.find = jest.fn().mockReturnValue(mockQueryChain);
      Task.countDocuments = jest.fn().mockResolvedValue(12);

      const result = await recurringTaskService.getTaskInstances(parentTaskId, query);

      expect(mockQueryChain.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
      expect(result.pagination.pages).toBe(3); // Math.ceil(12/5)
    });
  });
});