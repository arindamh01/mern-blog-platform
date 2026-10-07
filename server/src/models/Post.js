const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' }, { weights: { title: 5, content: 1 } });

module.exports = mongoose.model('Post', postSchema);
