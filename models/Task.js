'use strict';

const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'overdue'], default: 'pending', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
  dueDate: { type: Date, default: null, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  labels: { type: [String], default: [] },
  subtasks: { type: [subtaskSchema], default: [] },
  attachments: { type: [String], default: [] },
  comments: { type: [commentSchema], default: [] },
  // Recurring task fields
  isRecurring: { type: Boolean, default: false, index: true },
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: null },
    interval: { type: Number, default: 1 }, // Every N days/weeks/months/years
    daysOfWeek: { type: [Number], default: [] }, // 0=Sunday, 1=Monday, etc. (for weekly)
    dayOfMonth: { type: Number, default: null }, // Day of month (for monthly)
    endDate: { type: Date, default: null }, // When to stop recurring
    maxOccurrences: { type: Number, default: null } // Max number of occurrences
  },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null }, // Reference to original recurring task
  nextDueDate: { type: Date, default: null, index: true }, // Next scheduled occurrence
  occurrenceCount: { type: Number, default: 0 }, // How many times this has recurred
  // Kanban board fields
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', default: null, index: true },
  columnId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  position: { type: Number, default: 0 }, // Position within the column
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

taskSchema.index({ title: 'text', description: 'text', labels: 'text' });

// Composite indexes for common filter combinations
taskSchema.index({ isDeleted: 1, createdBy: 1, createdAt: -1 });
taskSchema.index({ isDeleted: 1, assignedTo: 1, createdAt: -1 });
taskSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
taskSchema.index({ isDeleted: 1, priority: 1, createdAt: -1 });
taskSchema.index({ isDeleted: 1, dueDate: 1, createdAt: -1 });
// Kanban board indexes
taskSchema.index({ isDeleted: 1, boardId: 1, columnId: 1, position: 1 });
taskSchema.index({ boardId: 1, status: 1, createdAt: -1 });
taskSchema.index({ isDeleted: 1, createdBy: 1, status: 1 });
taskSchema.index({ isDeleted: 1, assignedTo: 1, status: 1 });
// Recurring task indexes
taskSchema.index({ isRecurring: 1, nextDueDate: 1 });
taskSchema.index({ parentTask: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);


