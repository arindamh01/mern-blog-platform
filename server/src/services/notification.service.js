const { getIO, userRoom, ADMIN_ROOM } = require('../sockets');

function emit(room, payload) {
  const io = getIO();
  if (!io) return;
  io.to(room).emit('notification', { ...payload, createdAt: new Date().toISOString() });
}

function notifyNewComment({ post, comment, commenter }) {
  const authorId = String(post.author?._id || post.author);
  if (authorId === String(commenter._id)) return;

  emit(userRoom(authorId), {
    type: 'COMMENT_CREATED',
    message: `${commenter.name} commented on "${post.title}"`,
    postSlug: post.slug,
    commentId: String(comment._id),
  });
}

function notifyAdminsNewPost({ post, author }) {
  emit(ADMIN_ROOM, {
    type: 'POST_CREATED',
    message: `${author.name} published "${post.title}"`,
    postSlug: post.slug,
  });
}

function notifyAdminsNewUser(user) {
  emit(ADMIN_ROOM, {
    type: 'USER_REGISTERED',
    message: `New user registered: ${user.name}`,
    userId: String(user._id),
  });
}

module.exports = { notifyNewComment, notifyAdminsNewPost, notifyAdminsNewUser };
