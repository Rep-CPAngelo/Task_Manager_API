'use strict';

const emailService = require('../../services/emailService');
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService Unit Tests', () => {
  let mockTransporter;

  beforeAll(() => {
    // Mock console.log to prevent logging during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn()
    };

    // Mock nodemailer.createTransporter to return our mock
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    nodemailer.createTestAccount.mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'testpassword'
    });
    nodemailer.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/test');

    // Reset the email service transporter
    emailService.transporter = mockTransporter;
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id-123'
      });

      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_FROM || 'Task Manager <noreply@taskmanager.com>',
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>'
      });
    });

    it('should handle email send failure', async () => {
      const sendError = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(sendError);

      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'This is a test email'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });

    it('should throw error when transporter not initialized', async () => {
      emailService.transporter = null;

      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'This is a test email'
      };

      await expect(emailService.sendEmail(emailOptions)).rejects.toThrow('Email service not initialized');
    });

    it('should generate email content from template', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id-123'
      });

      const emailOptions = {
        to: 'user@example.com',
        subject: 'Task Due Soon',
        template: 'task_due_soon',
        templateData: {
          userName: 'John Doe',
          taskTitle: 'Complete project',
          dueDate: 'tomorrow',
          priority: 'high',
          description: 'Important project deadline'
        }
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Task Due Soon',
          text: expect.stringContaining('John Doe'),
          html: expect.stringContaining('Complete project')
        })
      );
    });
  });

  describe('generateEmailContent', () => {
    it('should generate task_due_soon template correctly', () => {
      const templateData = {
        userName: 'John Doe',
        taskTitle: 'Complete project report',
        dueDate: 'tomorrow at 5 PM',
        priority: 'high',
        description: 'Quarterly project report'
      };

      const content = emailService.generateEmailContent('task_due_soon', templateData);

      expect(content.text).toContain('John Doe');
      expect(content.text).toContain('Complete project report');
      expect(content.text).toContain('tomorrow at 5 PM');
      expect(content.text).toContain('high');
      expect(content.text).toContain('Quarterly project report');

      expect(content.html).toContain('<strong>John Doe</strong>');
      expect(content.html).toContain('<strong>Complete project report</strong>');
      expect(content.html).toContain('⏰ Task Due Soon');
    });

    it('should generate task_due_urgent template correctly', () => {
      const templateData = {
        userName: 'Jane Smith',
        taskTitle: 'Submit proposal',
        priority: 'medium',
        description: 'Client proposal submission'
      };

      const content = emailService.generateEmailContent('task_due_urgent', templateData);

      expect(content.text).toContain('URGENT');
      expect(content.text).toContain('Jane Smith');
      expect(content.text).toContain('Submit proposal');
      expect(content.text).toContain('1 hour');

      expect(content.html).toContain('🚨 URGENT');
      expect(content.html).toContain('<strong>Jane Smith</strong>');
      expect(content.html).toContain('Submit proposal');
    });

    it('should generate task_overdue template correctly', () => {
      const templateData = {
        userName: 'Bob Wilson',
        taskTitle: 'Review documents',
        dueDate: 'yesterday',
        priority: 'low'
      };

      const content = emailService.generateEmailContent('task_overdue', templateData);

      expect(content.text).toContain('overdue');
      expect(content.text).toContain('Bob Wilson');
      expect(content.text).toContain('Review documents');
      expect(content.text).toContain('yesterday');

      expect(content.html).toContain('⚠️ Task Overdue');
      expect(content.html).toContain('<strong>Bob Wilson</strong>');
      expect(content.html).toContain('overdue');
    });

    it('should generate task_assigned template correctly', () => {
      const templateData = {
        userName: 'Alice Johnson',
        taskTitle: 'Code review',
        assignedBy: 'Team Lead',
        dueDate: 'Friday',
        priority: 'medium',
        description: 'Review pull request #123'
      };

      const content = emailService.generateEmailContent('task_assigned', templateData);

      expect(content.text).toContain('Alice Johnson');
      expect(content.text).toContain('Code review');
      expect(content.text).toContain('Team Lead');
      expect(content.text).toContain('Friday');

      expect(content.html).toContain('📋 New Task Assigned');
      expect(content.html).toContain('<strong>Alice Johnson</strong>');
      expect(content.html).toContain('Team Lead');
    });

    it('should handle missing template data gracefully', () => {
      const templateData = {
        userName: 'Test User',
        taskTitle: 'Test Task',
        priority: 'medium'
        // Missing description, dueDate
      };

      const content = emailService.generateEmailContent('task_due_soon', templateData);

      expect(content.text).toContain('Test User');
      expect(content.text).toContain('Test Task');
      expect(content.html).toContain('Test User');
      expect(content.html).toContain('Test Task');
    });

    it('should throw error for unknown template', () => {
      const templateData = {
        userName: 'Test User',
        taskTitle: 'Test Task'
      };

      expect(() => {
        emailService.generateEmailContent('unknown_template', templateData);
      }).toThrow('Email template \'unknown_template\' not found');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors for different priorities', () => {
      expect(emailService.getPriorityColor('low')).toBe('#27ae60');
      expect(emailService.getPriorityColor('medium')).toBe('#f39c12');
      expect(emailService.getPriorityColor('high')).toBe('#e74c3c');
      expect(emailService.getPriorityColor('unknown')).toBe('#7f8c8d');
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails successfully', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'msg-1' })
        .mockResolvedValueOnce({ messageId: 'msg-2' })
        .mockResolvedValueOnce({ messageId: 'msg-3' });

      const notifications = [
        {
          id: '1',
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Message 1'
        },
        {
          id: '2',
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Message 2'
        },
        {
          id: '3',
          to: 'user3@example.com',
          subject: 'Test 3',
          text: 'Message 3'
        }
      ];

      const results = await emailService.sendBulkEmails(notifications);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBe('msg-1');
      expect(results[1].success).toBe(true);
      expect(results[1].messageId).toBe('msg-2');
      expect(results[2].success).toBe(true);
      expect(results[2].messageId).toBe('msg-3');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in bulk send', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({ messageId: 'msg-3' });

      const notifications = [
        {
          id: '1',
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Message 1'
        },
        {
          id: '2',
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Message 2'
        },
        {
          id: '3',
          to: 'user3@example.com',
          subject: 'Test 3',
          text: 'Message 3'
        }
      ];

      const results = await emailService.sendBulkEmails(notifications);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBe('msg-1');
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Send failed');
      expect(results[2].success).toBe(true);
      expect(results[2].messageId).toBe('msg-3');
    });

    it('should include delay between emails to avoid rate limiting', async () => {
      jest.useFakeTimers();

      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'msg-1' })
        .mockResolvedValueOnce({ messageId: 'msg-2' });

      const notifications = [
        {
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Message 1'
        },
        {
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Message 2'
        }
      ];

      const resultPromise = emailService.sendBulkEmails(notifications);

      // Fast-forward through delays
      jest.advanceTimersByTime(200);

      const results = await resultPromise;

      expect(results).toHaveLength(2);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('verifyConnection', () => {
    it('should verify connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    it('should handle verification failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.verifyConnection();

      expect(result).toBe(false);
    });

    it('should return true for mock transporter without verify method', async () => {
      emailService.transporter = { sendMail: jest.fn() }; // No verify method

      const result = await emailService.verifyConnection();

      expect(result).toBe(true);
    });
  });
});