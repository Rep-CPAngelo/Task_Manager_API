const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jti: { type: String, required: true, unique: true, index: true },
  revoked: { type: Boolean, default: false },
  replacedByJti: { type: String, default: null },
  createdByIp: { type: String, default: null },
  userAgent: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: true }
}, {
  timestamps: true
});

// TTL index to auto-remove expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);


