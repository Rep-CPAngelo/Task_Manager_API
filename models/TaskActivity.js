'use strict';

const mongoose = require('mongoose');

const taskActivitySchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: {
    type: String,
    enum: [
      'task_created',
      'task_updated',
      'task_status_updated',
      'task_deleted',
      'comment_added',
      'attachment_added',
      'subtask_added',
      'subtask_updated'
    ],
    required: true,
    index: true
  },
  details: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

taskActivitySchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('TaskActivity', taskActivitySchema);


