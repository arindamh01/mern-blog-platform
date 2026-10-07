jest.mock('../../src/sockets', () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  return {
    getIO: jest.fn(() => ({ to })),
    userRoom: (id) => `user:${id}`,
    ADMIN_ROOM: 'admins',
    __mocks: { to, emit },
  };
});

const sockets = require('../../src/sockets');
const notificationService = require('../../src/services/notification.service');

const { to, emit } = sockets.__mocks;

describe('notification service', () => {
  beforeEach(() => jest.clearAllMocks());

  const post = { _id: 'p1', title: 'Hello', slug: 'hello', author: 'author-1' };

  it("notifies the post author's room when someone else comments", () => {
    notificationService.notifyNewComment({
      post,
      comment: { _id: 'c1' },
      commenter: { _id: 'other', name: 'Sam' },
    });

    expect(to).toHaveBeenCalledWith('user:author-1');
    expect(emit).toHaveBeenCalledWith(
      'notification',
      expect.objectContaining({ type: 'COMMENT_CREATED', postSlug: 'hello' }),
    );
  });

  it('does not notify authors about their own comments', () => {
    notificationService.notifyNewComment({
      post,
      comment: { _id: 'c1' },
      commenter: { _id: 'author-1', name: 'Me' },
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it('notifies admins about new posts', () => {
    notificationService.notifyAdminsNewPost({ post, author: { name: 'Sam' } });
    expect(to).toHaveBeenCalledWith('admins');
    expect(emit).toHaveBeenCalledWith(
      'notification',
      expect.objectContaining({ type: 'POST_CREATED' }),
    );
  });

  it('is a no-op when sockets are not initialised', () => {
    sockets.getIO.mockReturnValueOnce(null);
    notificationService.notifyAdminsNewUser({ _id: 'u1', name: 'New' });
    expect(emit).not.toHaveBeenCalled();
  });
});
