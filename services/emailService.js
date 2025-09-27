'use strict';

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    // Create email transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration (e.g., SendGrid, AWS SES, etc.)
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      // Development/Test configuration using Ethereal Email
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Email service initialized with test account:', testAccount.user);
      } catch (error) {
        console.error('Failed to create email test account:', error);
        // Fallback to console logging in development
        this.transporter = {
          sendMail: async (mailOptions) => {
            console.log('📧 Email would be sent:', {
              to: mailOptions.to,
              subject: mailOptions.subject,
              text: mailOptions.text
            });
            return { messageId: 'test-' + Date.now() };
          }
        };
      }
    }
  }

  /**
   * Send email notification
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    const { to, subject, text, html, template, templateData } = options;

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    let emailContent = { text, html };

    // If template is specified, generate content
    if (template) {
      emailContent = this.generateEmailContent(template, templateData);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Task Manager <noreply@taskmanager.com>',
      to,
      subject,
      ...emailContent
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);

      // Log preview URL for development
      if (process.env.NODE_ENV !== 'production' && result.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        if (previewUrl) {
          console.log('📧 Email preview:', previewUrl);
        }
      }

      return {
        success: true,
        messageId: result.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ?
          nodemailer.getTestMessageUrl(result) : null
      };
    } catch (error) {
      console.error('Email send failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate email content based on template
   * @param {String} template - Template name
   * @param {Object} data - Template data
   * @returns {Object} Email content with text and html
   */
  generateEmailContent(template, data) {
    const templates = {
      task_due_soon: {
        subject: `⏰ Task "${data.taskTitle}" is due soon`,
        text: `Hello ${data.userName},

Your task "${data.taskTitle}" is due ${data.dueDate}.

${data.description ? `Description: ${data.description}` : ''}

Priority: ${data.priority}

Please complete it on time to stay on track.

Best regards,
Task Manager Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12;">⏰ Task Due Soon</h2>
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p>Your task "<strong>${data.taskTitle}</strong>" is due <strong>${data.dueDate}</strong>.</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            <p><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(data.priority)}">${data.priority}</span></p>
            <p>Please complete it on time to stay on track.</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Best regards,</strong><br>Task Manager Team</p>
            </div>
          </div>
        `
      },

      task_due_urgent: {
        subject: `🚨 URGENT: Task "${data.taskTitle}" is due in 1 hour!`,
        text: `Hello ${data.userName},

URGENT: Your task "${data.taskTitle}" is due in 1 hour!

${data.description ? `Description: ${data.description}` : ''}

Priority: ${data.priority}

Please complete it immediately to avoid missing the deadline.

Best regards,
Task Manager Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">🚨 URGENT: Task Due in 1 Hour!</h2>
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p><strong style="color: #e74c3c;">URGENT:</strong> Your task "<strong>${data.taskTitle}</strong>" is due in <strong>1 hour</strong>!</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            <p><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(data.priority)}">${data.priority}</span></p>
            <div style="background-color: #ffeaa7; padding: 15px; border-radius: 5px; border-left: 5px solid #fdcb6e;">
              <p><strong>⚡ Action Required:</strong> Please complete this task immediately to avoid missing the deadline.</p>
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Best regards,</strong><br>Task Manager Team</p>
            </div>
          </div>
        `
      },

      task_overdue: {
        subject: `⚠️ Task "${data.taskTitle}" is overdue`,
        text: `Hello ${data.userName},

Your task "${data.taskTitle}" was due on ${data.dueDate} and is now overdue.

${data.description ? `Description: ${data.description}` : ''}

Priority: ${data.priority}

Please complete it as soon as possible.

Best regards,
Task Manager Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">⚠️ Task Overdue</h2>
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p>Your task "<strong>${data.taskTitle}</strong>" was due on <strong>${data.dueDate}</strong> and is now <strong style="color: #e74c3c;">overdue</strong>.</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            <p><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(data.priority)}">${data.priority}</span></p>
            <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; border-left: 5px solid #f44336;">
              <p><strong>📋 Action Required:</strong> Please complete this task as soon as possible.</p>
            </div>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Best regards,</strong><br>Task Manager Team</p>
            </div>
          </div>
        `
      },

      task_assigned: {
        subject: `📋 New task assigned: "${data.taskTitle}"`,
        text: `Hello ${data.userName},

A new task has been assigned to you by ${data.assignedBy}.

Task: "${data.taskTitle}"
${data.description ? `Description: ${data.description}` : ''}
Due Date: ${data.dueDate}
Priority: ${data.priority}

Please review and start working on it.

Best regards,
Task Manager Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3498db;">📋 New Task Assigned</h2>
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p>A new task has been assigned to you by <strong>${data.assignedBy}</strong>.</p>
            <div style="background-color: #e8f6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2980b9;">"${data.taskTitle}"</h3>
              ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
              <p><strong>Priority:</strong> <span style="color: ${this.getPriorityColor(data.priority)}">${data.priority}</span></p>
            </div>
            <p>Please review and start working on it.</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Best regards,</strong><br>Task Manager Team</p>
            </div>
          </div>
        `
      }
    };

    const template_config = templates[template];
    if (!template_config) {
      throw new Error(`Email template '${template}' not found`);
    }

    return {
      text: template_config.text,
      html: template_config.html
    };
  }

  /**
   * Get color for priority display
   * @param {String} priority - Task priority
   * @returns {String} Color code
   */
  getPriorityColor(priority) {
    const colors = {
      low: '#27ae60',
      medium: '#f39c12',
      high: '#e74c3c'
    };
    return colors[priority] || '#7f8c8d';
  }

  /**
   * Send bulk notifications
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Array>} Results array
   */
  async sendBulkEmails(notifications) {
    const results = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendEmail(notification);
        results.push({
          notification: notification.id || notification.to,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
      } catch (error) {
        results.push({
          notification: notification.id || notification.to,
          success: false,
          error: error.message
        });
      }

      // Add small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Verify email configuration
   * @returns {Promise<Boolean>} Verification result
   */
  async verifyConnection() {
    try {
      if (this.transporter.verify) {
        await this.transporter.verify();
        return true;
      }
      return true; // For mock transporter
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();