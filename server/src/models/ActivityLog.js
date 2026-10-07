const mongoose = require('mongoose');
const { ACTIVITY_ACTIONS } = require('../utils/constants');

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, enum: Object.values(ACTIVITY_ACTIONS), required: true },
    targetType: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
