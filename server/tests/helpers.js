const request = require('supertest');
const createApp = require('../src/app');
const { User, Post } = require('../src/models');
const { signAccessToken } = require('../src/services/token.service');
const { ROLES } = require('../src/utils/constants');

const app = createApp();
const api = () => request(app);

let counter = 0;

async function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    name: `User ${counter}`,
    email: `user${counter}@test.dev`,
    password: 'Password123',
    ...overrides,
  });
}

const createAdmin = (overrides = {}) => createUser({ role: ROLES.ADMIN, ...overrides });

const authHeader = (user) => ({ Authorization: `Bearer ${signAccessToken(user)}` });

async function createPost(author, overrides = {}) {
  counter += 1;
  return Post.create({
    title: `Post ${counter}`,
    content: 'Some meaningful post content here.',
    slug: `post-${counter}`,
    author: author._id,
    ...overrides,
  });
}

module.exports = { app, api, createUser, createAdmin, authHeader, createPost };
