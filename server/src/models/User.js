const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, AUTH_PROVIDERS } = require('../utils/constants');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
    provider: { type: String, enum: Object.values(AUTH_PROVIDERS), default: AUTH_PROVIDERS.LOCAL },
    providerId: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ provider: 1, providerId: 1 }, { sparse: true });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
