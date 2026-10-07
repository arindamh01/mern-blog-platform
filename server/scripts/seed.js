/* eslint-disable no-console */
const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Post, Comment, ActivityLog, RefreshToken } = require('../src/models');
const { toSlug } = require('../src/utils/slug');
const { ROLES } = require('../src/utils/constants');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@blog.dev';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const USER_PASSWORD = 'User@12345';

const samplePosts = [
  {
    title: 'Getting Started with the MERN Stack',
    content:
      'MongoDB, Express, React and Node.js form a JavaScript-only stack that lets one team own the whole product. In this post we walk through how the pieces fit together, from Mongoose schemas to React hooks.',
  },
  {
    title: 'Why Refresh Token Rotation Matters',
    content:
      'Short-lived access tokens limit the blast radius of a leak, but refresh tokens live much longer. Rotating them on every use and detecting reuse lets the server spot a stolen token and revoke the whole session family.',
  },
  {
    title: 'Indexing Strategies for MongoDB',
    content:
      'Compound indexes should follow the equality, sort, range rule. For a blog feed that filters on isDeleted and sorts by createdAt, an index on { isDeleted: 1, createdAt: -1 } serves the query without an in-memory sort.',
  },
  {
    title: 'Building Protected Routes in React',
    content:
      'A protected route is just a component that reads auth state from context and either renders its children or redirects. Keeping the original location in router state lets the login page send the user back where they started.',
  },
];

async function seed() {
  await connectDB();

  if (process.argv.includes('--reset')) {
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      ActivityLog.deleteMany({}),
      RefreshToken.deleteMany({}),
    ]);
    console.log('Database cleared');
  }

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: 'Site Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: ROLES.ADMIN,
    });
    console.log(`Created admin ${ADMIN_EMAIL}`);
  }

  if ((await Post.estimatedDocumentCount()) === 0) {
    const users = await User.create([
      { name: 'Alice Writer', email: 'alice@blog.dev', password: USER_PASSWORD },
      { name: 'Bob Reader', email: 'bob@blog.dev', password: USER_PASSWORD },
    ]);
    const authors = [users[0], users[1], users[0], admin];

    const posts = await Post.create(
      samplePosts.map((post, i) => ({ ...post, slug: toSlug(post.title), author: authors[i]._id })),
    );

    await Comment.create([
      { content: 'Great introduction, thanks!', post: posts[0]._id, author: users[1]._id },
      { content: 'Reuse detection is such a neat trick.', post: posts[1]._id, author: users[0]._id },
      { content: 'The ESR rule finally clicked for me.', post: posts[2]._id, author: admin._id },
    ]);
    console.log(`Created ${users.length} users, ${posts.length} posts and 3 comments`);
  }

  console.log('\nLogin credentials:');
  console.log(`  Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Users: alice@blog.dev, bob@blog.dev / ${USER_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
