'use strict';

const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Global notification settings
  globalEnabled: {
    type: Boolean,
    default: true
  },

  // Channel preferences
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      address: {
        type: String,
        // Will default to user's email if not specified
      }
    },

    inApp: {
      enabled: {
        type: Boolean,
        default: true
      }
    },

    push: {
      enabled: {
        type: Boolean,
        default: false
      }
    }
  },

  // Notification type preferences
  preferences: {
    // Task due notifications
    taskDueSoon: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }],
      advance: {
        type: Number,
        default: 24, // hours before due date
        min: 1,
        max: 168 // 1 week
      }
    },

    taskDueUrgent: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }],
      advance: {
        type: Number,
        default: 1, // hours before due date
        min: 0.25, // 15 minutes
        max: 12
      }
    },

    taskOverdue: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }],
      frequency: {
        type: String,
        default: 'daily',
        enum: ['once', 'daily', 'weekly']
      }
    },

    taskAssigned: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }]
    },

    taskCompleted: {
      enabled: {
        type: Boolean,
        default: false // Off by default to avoid spam
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }]
    },

    taskUpdated: {
      enabled: {
        type: Boolean,
        default: false // Off by default to avoid spam
      },
      channels: [{
        type: String,
        enum: ['email', 'in_app', 'push']
      }]
    }
  },

  // Quiet hours - no notifications during this time
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00',
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    },
    end: {
      type: String,
      default: '08:00',
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },

  // Digest settings
  digest: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      default: 'daily',
      enum: ['daily', 'weekly']
    },
    time: {
      type: String,
      default: '09:00',
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    }
  }
}, {
  timestamps: true
});

// Default channel preferences
notificationPreferenceSchema.pre('validate', function(next) {
  // Set default channels for each notification type
  const defaultChannels = {
    taskDueSoon: ['email', 'in_app'],
    taskDueUrgent: ['email', 'in_app'],
    taskOverdue: ['email', 'in_app'],
    taskAssigned: ['email', 'in_app'],
    taskCompleted: ['in_app'],
    taskUpdated: ['in_app']
  };

  Object.keys(defaultChannels).forEach(key => {
    if (!this.preferences[key].channels || this.preferences[key].channels.length === 0) {
      this.preferences[key].channels = defaultChannels[key];
    }
  });

  next();
});

// Instance methods
notificationPreferenceSchema.methods.shouldNotify = function(notificationType, channel) {
  if (!this.globalEnabled) return false;
  if (!this.channels[channel]?.enabled) return false;
  if (!this.preferences[notificationType]?.enabled) return false;

  const preferredChannels = this.preferences[notificationType].channels || [];
  return preferredChannels.includes(channel);
};

notificationPreferenceSchema.methods.isQuietTime = function(date = new Date()) {
  if (!this.quietHours.enabled) return false;

  const now = new Date(date);
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM format

  const start = this.quietHours.start;
  const end = this.quietHours.end;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return timeStr >= start || timeStr <= end;
  }

  // Normal quiet hours (e.g., 01:00 to 06:00)
  return timeStr >= start && timeStr <= end;
};

// Static methods
notificationPreferenceSchema.statics.getOrCreatePreferences = async function(userId) {
  let preferences = await this.findOne({ user: userId });

  if (!preferences) {
    preferences = new this({ user: userId });
    await preferences.save();
  }

  return preferences;
};

notificationPreferenceSchema.statics.getUsersToNotify = function(notificationType, channel = 'email') {
  const filter = {
    globalEnabled: true,
    [`channels.${channel}.enabled`]: true,
    [`preferences.${notificationType}.enabled`]: true,
    [`preferences.${notificationType}.channels`]: channel
  };

  return this.find(filter).populate('user', 'name email');
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);