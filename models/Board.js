'use strict';

const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  position: {
    type: Number,
    required: true,
    min: 0
  },
  color: {
    type: String,
    default: '#3498db',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  wipLimit: {
    type: Number,
    min: 0,
    default: null
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
}, {
  _id: true,
  timestamps: true
});

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  columns: [columnSchema],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  settings: {
    allowGuestView: {
      type: Boolean,
      default: false
    },
    requireApprovalForJoin: {
      type: Boolean,
      default: true
    },
    defaultTaskPriority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    enableWipLimits: {
      type: Boolean,
      default: false
    },
    autoArchiveCompleted: {
      type: Boolean,
      default: false
    },
    autoArchiveDays: {
      type: Number,
      min: 1,
      max: 365,
      default: 30
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  backgroundColor: {
    type: String,
    default: '#ffffff',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  stats: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    activeTasks: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ visibility: 1, isArchived: 1 });
boardSchema.index({ tags: 1 });
boardSchema.index({ 'stats.lastActivity': -1 });

// Virtual for task count by column
boardSchema.virtual('tasksByColumn', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'boardId',
  justOne: false
});

// Instance methods
boardSchema.methods.isMember = function(userId) {
  return this.members.some(member =>
    member.user.toString() === userId.toString()
  );
};

boardSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member =>
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

boardSchema.methods.canEdit = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  const role = this.getMemberRole(userId);
  return ['owner', 'admin'].includes(role);
};

boardSchema.methods.canView = function(userId) {
  if (this.visibility === 'public') return true;
  if (this.settings.allowGuestView && this.visibility === 'team') return true;
  if (this.owner.toString() === userId.toString()) return true;
  return this.isMember(userId);
};

boardSchema.methods.addMember = function(userId, role = 'member', addedBy = null) {
  // Check if user is already a member
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this board');
  }

  this.members.push({
    user: userId,
    role: role,
    addedBy: addedBy
  });

  return this.save();
};

boardSchema.methods.removeMember = function(userId) {
  // Cannot remove the owner
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Cannot remove the board owner');
  }

  this.members = this.members.filter(member =>
    member.user.toString() !== userId.toString()
  );

  return this.save();
};

boardSchema.methods.updateMemberRole = function(userId, newRole) {
  // Cannot change owner role
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Cannot change owner role');
  }

  const member = this.members.find(member =>
    member.user.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('User is not a member of this board');
  }

  member.role = newRole;
  return this.save();
};

boardSchema.methods.addColumn = function(columnData) {
  // Set position if not provided
  if (columnData.position === undefined) {
    columnData.position = this.columns.length;
  }

  // Adjust positions of existing columns if needed
  this.columns.forEach(column => {
    if (column.position >= columnData.position) {
      column.position += 1;
    }
  });

  this.columns.push(columnData);
  this.columns.sort((a, b) => a.position - b.position);

  return this.save();
};

boardSchema.methods.updateColumn = function(columnId, updateData) {
  const column = this.columns.id(columnId);
  if (!column) {
    throw new Error('Column not found');
  }

  // Handle position changes
  if (updateData.position !== undefined && updateData.position !== column.position) {
    const oldPosition = column.position;
    const newPosition = updateData.position;

    // Adjust other columns' positions
    this.columns.forEach(col => {
      if (col._id.toString() !== columnId.toString()) {
        if (oldPosition < newPosition && col.position > oldPosition && col.position <= newPosition) {
          col.position -= 1;
        } else if (oldPosition > newPosition && col.position >= newPosition && col.position < oldPosition) {
          col.position += 1;
        }
      }
    });
  }

  Object.assign(column, updateData);
  this.columns.sort((a, b) => a.position - b.position);

  return this.save();
};

boardSchema.methods.removeColumn = function(columnId) {
  const column = this.columns.id(columnId);
  if (!column) {
    throw new Error('Column not found');
  }

  const removedPosition = column.position;

  // Remove the column
  this.columns.pull(columnId);

  // Adjust positions of remaining columns
  this.columns.forEach(col => {
    if (col.position > removedPosition) {
      col.position -= 1;
    }
  });

  return this.save();
};

boardSchema.methods.updateStats = async function() {
  const Task = mongoose.model('Task');

  const stats = await Task.aggregate([
    { $match: { boardId: this._id, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        activeTasks: {
          $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] }
        },
        lastActivity: { $max: '$updatedAt' }
      }
    }
  ]);

  if (stats.length > 0) {
    this.stats = {
      totalTasks: stats[0].totalTasks || 0,
      completedTasks: stats[0].completedTasks || 0,
      activeTasks: stats[0].activeTasks || 0,
      lastActivity: stats[0].lastActivity || this.stats.lastActivity
    };
  } else {
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      lastActivity: this.stats.lastActivity
    };
  }

  return this.save();
};

// Static methods
boardSchema.statics.findByUser = function(userId, options = {}) {
  const {
    includeArchived = false,
    role = null,
    visibility = null,
    page = 1,
    limit = 20
  } = options;

  const query = {
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  };

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (visibility) {
    query.visibility = visibility;
  }

  let dbQuery = this.find(query)
    .populate('owner', 'username email')
    .populate('members.user', 'username email')
    .populate('members.addedBy', 'username email')
    .sort({ 'stats.lastActivity': -1, createdAt: -1 });

  if (role) {
    dbQuery = dbQuery.where('members.role').equals(role);
  }

  const skip = (page - 1) * limit;
  return dbQuery.skip(skip).limit(limit);
};

boardSchema.statics.findPublic = function(options = {}) {
  const { page = 1, limit = 20, tags = [] } = options;

  const query = {
    visibility: 'public',
    isArchived: false
  };

  if (tags.length > 0) {
    query.tags = { $in: tags };
  }

  const skip = (page - 1) * limit;
  return this.find(query)
    .populate('owner', 'username email')
    .sort({ 'stats.lastActivity': -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
boardSchema.pre('save', function(next) {
  // Ensure owner is also in members with owner role
  if (this.isNew || this.isModified('owner')) {
    const ownerMember = this.members.find(member =>
      member.user.toString() === this.owner.toString()
    );

    if (!ownerMember) {
      this.members.unshift({
        user: this.owner,
        role: 'owner',
        addedAt: new Date()
      });
    } else if (ownerMember.role !== 'owner') {
      ownerMember.role = 'owner';
    }
  }

  // Update lastActivity if this is not a new document
  if (!this.isNew) {
    this.stats.lastActivity = new Date();
  }

  next();
});

module.exports = mongoose.model('Board', boardSchema);