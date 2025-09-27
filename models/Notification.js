'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Core notification info
  type: {
    type: String,
    required: true,
    enum: [
      'task_due_soon',      // Task due in 1 day
      'task_due_urgent',    // Task due in 1 hour
      'task_overdue',       // Task past due date
      'task_assigned',      // Task assigned to user
      'task_completed',     // Task marked complete
      'task_updated',       // Task details updated
      'reminder_custom'     // Custom reminder set by user
    ]
  },

  // Recipients and content
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  message: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Related entities
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },

  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Scheduling
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },

  // Delivery tracking
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled']
  },

  sentAt: Date,
  failureReason: String,

  // Delivery methods
  channels: [{
    type: String,
    enum: ['email', 'in_app', 'push'], // Extensible for future channels
    default: ['email', 'in_app']
  }],

  // Email specific
  emailSent: {
    type: Boolean,
    default: false
  },

  emailDelivered: {
    type: Boolean,
    default: false
  },

  // In-app notification
  read: {
    type: Boolean,
    default: false
  },

  readAt: Date,

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ type: 1, scheduledFor: 1 });
notificationSchema.index({ relatedTask: 1, type: 1 });

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function(channel = 'email') {
  this.status = 'sent';
  this.sentAt = new Date();

  if (channel === 'email') {
    this.emailSent = true;
  }

  return this.save();
};

notificationSchema.methods.markAsDelivered = function(channel = 'email') {
  this.status = 'delivered';

  if (channel === 'email') {
    this.emailDelivered = true;
  }

  return this.save();
};

notificationSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Static methods
notificationSchema.statics.getPendingNotifications = function() {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).populate('recipient relatedTask relatedUser');
};

notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null
  } = options;

  const filter = { recipient: userId };
  if (unreadOnly) filter.read = false;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  return Promise.all([
    this.find(filter)
      .populate('relatedTask', 'title status priority dueDate')
      .populate('relatedUser', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]).then(([notifications, total]) => ({
    notifications,
    pagination: {
      current: page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }));
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);