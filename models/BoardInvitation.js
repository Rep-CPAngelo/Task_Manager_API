'use strict';

const mongoose = require('mongoose');

const boardInvitationSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Allow null for email invitations
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function() {
        // Either invitedUser or email must be present, but not both
        return (this.invitedUser && !this.email) || (!this.invitedUser && this.email);
      },
      message: 'Either invitedUser or email must be provided, but not both'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  acceptedAt: {
    type: Date
  },
  declinedAt: {
    type: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    inviteType: {
      type: String,
      enum: ['direct', 'email', 'link'],
      default: 'direct'
    }
  }
}, {
  timestamps: true
});

// Indexes
boardInvitationSchema.index({ board: 1, invitedUser: 1 });
boardInvitationSchema.index({ board: 1, email: 1 });
boardInvitationSchema.index({ token: 1 });
boardInvitationSchema.index({ expiresAt: 1 });
boardInvitationSchema.index({ status: 1 });

// TTL index to automatically remove expired invitations
boardInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
boardInvitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

boardInvitationSchema.methods.canAccept = function() {
  return this.status === 'pending' && !this.isExpired();
};

boardInvitationSchema.methods.accept = function(userId = null) {
  if (!this.canAccept()) {
    throw new Error('Invitation cannot be accepted');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();

  if (userId && !this.invitedUser) {
    this.invitedUser = userId;
  }

  return this;
};

boardInvitationSchema.methods.decline = function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation cannot be declined');
  }

  this.status = 'declined';
  this.declinedAt = new Date();

  return this;
};

boardInvitationSchema.methods.cancel = function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation cannot be cancelled');
  }

  this.status = 'cancelled';

  return this;
};

// Static methods
boardInvitationSchema.statics.findPendingByUser = function(userId) {
  return this.find({
    invitedUser: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('board', 'title description')
    .populate('invitedBy', 'username email');
};

boardInvitationSchema.statics.findPendingByEmail = function(email) {
  return this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('board', 'title description')
    .populate('invitedBy', 'username email');
};

boardInvitationSchema.statics.findByToken = function(token) {
  return this.findOne({ token })
    .populate('board', 'title description settings')
    .populate('invitedBy', 'username email')
    .populate('invitedUser', 'username email');
};

// Pre-save middleware
boardInvitationSchema.pre('save', function(next) {
  // Generate token if not provided
  if (this.isNew && !this.token) {
    this.token = require('crypto').randomBytes(32).toString('hex');
  }

  next();
});

module.exports = mongoose.model('BoardInvitation', boardInvitationSchema);