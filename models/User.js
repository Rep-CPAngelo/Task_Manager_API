const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
userSchema.index({ createdAt: -1 });

// Virtual for user's full profile (excluding password)
userSchema.virtual('profile').get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware to check if email is unique
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('email')) return next();

  try {
    const existingUser = await this.constructor.findOne({ email: this.email });
    if (existingUser && existingUser._id.toString() !== this._id.toString()) {
      const error = new Error('Email already exists');
      error.name = 'ValidationError';
      return next(error);
    }
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Instance method to get public profile
 */
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * Static method to find user by email
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

/**
 * Static method to check if email exists
 */
userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase(), isDeleted: false });
  return !!user;
};

/**
 * Static method to validate credentials
 */
userSchema.statics.validateCredentials = async function (email, password) {
  try {
    const user = await this.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+password');
    if (!user || !user.isActive || user.isDeleted) {
      return null;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return null;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return user.getPublicProfile();
  } catch (error) {
    throw new Error('Credential validation failed');
  }
};

/**
 * Static method to get user statistics
 */
userSchema.statics.getStats = async function () {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          },
          adminUsers: {
            $sum: {
              $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const newUsersThisMonth = await this.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    return {
      totalUsers: stats[0]?.totalUsers || 0,
      activeUsers: stats[0]?.activeUsers || 0,
      adminUsers: stats[0]?.adminUsers || 0,
      newUsersThisMonth
    };
  } catch (error) {
    throw new Error('Failed to get user statistics');
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
