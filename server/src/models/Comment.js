const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

module.exports = mongoose.model('Comment', commentSchema);
