import api, { API_URL } from './client';

const unwrap = (promise) => promise.then((res) => res.data);

export const authApi = {
  register: (body) => unwrap(api.post('/auth/register', body)),
  login: (body) => unwrap(api.post('/auth/login', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  oauthUrl: (provider) => `${API_URL}/auth/${provider}`,
};

export const postsApi = {
  list: (params) => unwrap(api.get('/posts', { params })),
  mine: (params) => unwrap(api.get('/users/me/posts', { params })),
  getBySlug: (slug) => unwrap(api.get(`/posts/${slug}`)),
  create: (body) => unwrap(api.post('/posts', body)),
  update: (id, body) => unwrap(api.patch(`/posts/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/posts/${id}`)),
};

export const commentsApi = {
  list: (postId, params) => unwrap(api.get(`/posts/${postId}/comments`, { params })),
  create: (postId, body) => unwrap(api.post(`/posts/${postId}/comments`, body)),
  update: (id, body) => unwrap(api.patch(`/comments/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/comments/${id}`)),
};

export const adminApi = {
  stats: () => unwrap(api.get('/admin/stats')),
  users: (params) => unwrap(api.get('/admin/users', { params })),
  updateUser: (id, body) => unwrap(api.patch(`/admin/users/${id}`, body)),
  deleteUser: (id) => unwrap(api.delete(`/admin/users/${id}`)),
  posts: (params) => unwrap(api.get('/admin/posts', { params })),
  deletePost: (id) => unwrap(api.delete(`/admin/posts/${id}`)),
  restorePost: (id) => unwrap(api.patch(`/admin/posts/${id}/restore`)),
  purgePost: (id) => unwrap(api.delete(`/admin/posts/${id}/permanent`)),
  comments: (params) => unwrap(api.get('/admin/comments', { params })),
  deleteComment: (id) => unwrap(api.delete(`/admin/comments/${id}`)),
  activity: (params) => unwrap(api.get('/admin/activity-logs', { params })),
};
