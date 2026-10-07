# Inkwell — MERN Blog Platform

A full-stack blog built with **MongoDB, Express 5, React 19 and Node.js**, featuring JWT access/refresh-token auth with rotation, Google & Facebook OAuth, role-based access control enforced at the API level, soft-deletable posts, comments, an admin panel, activity logging and real-time notifications over Socket.io.

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [Running tests](#running-tests)
7. [Deployment](#deployment)
8. [API reference](#api-reference)
9. [Design decisions](#design-decisions)
10. [Security notes](#security-notes)

---

## Features

| Area | What's implemented |
|---|---|
| **Authentication** | Register / login / logout · bcrypt (12 rounds) · short-lived JWT access token (15 min) + long-lived JWT refresh token in an `httpOnly` cookie · refresh-token **rotation with reuse detection** · Google & Facebook OAuth 2.0 (Passport) · rate-limited auth endpoints · secrets in `.env`, validated on boot |
| **Roles & permissions** | `user` and `admin` roles · `authorize(...roles)` middleware for route-level RBAC · ownership rules (owner **or** admin) enforced in the **service layer** so they cannot be bypassed |
| **Posts** | CRUD · title, content, author, timestamps · unique URL-friendly **slug** (regenerated when the title changes) · **soft delete** (`isDeleted`, `deletedAt`, `deletedBy`) with admin restore and permanent purge · full-text search · Zod validation |
| **Comments** | CRUD on posts via Mongoose references · users edit/delete only their own; admins manage all · paginated per post |
| **Admin panel** | Dedicated React area at `/admin` · dashboard with total users / posts / comments (+ admins, soft-deleted posts, recent activity) · manage users (role, activate/deactivate, delete) · manage posts (filter active/all/deleted, restore, delete, purge) · manage comments · activity log viewer |
| **Middleware** | `authenticate`, `optionalAuth`, `authorize`, `validate`, `logActivity`, rate limiters, centralized `errorHandler` + `notFound` |
| **API design** | Versioned (`/api/v1`) · grouped Express routers · consistent success and error envelopes · proper status codes |
| **Performance** | Compound + text indexes · capped pagination (`limit ≤ 50`) · `.lean()` + field projection · narrow `populate` · parallel `find`/`count` · comments fetched separately (no unbounded embedding) |
| **Real-time (bonus)** | Socket.io with JWT handshake · authors are notified when someone comments on their post · admins are notified about new posts and new users · notification bell with live status |
| **Testing** | **105 Jest tests** (unit + integration with Supertest and `mongodb-memory-server`, ~96% line coverage) · **10 Vitest/RTL tests** on the client |

---

## Tech stack

**Server:** Node 20+, Express 5, Mongoose 8, Zod, jsonwebtoken, bcryptjs, Passport (Google / Facebook), express-rate-limit, Helmet, Socket.io
**Client:** React 19 (functional components + hooks), React Router 7, Context API, Axios, Tailwind CSS 4, socket.io-client, react-hot-toast, Vite
**Testing:** Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library

---

## Architecture

```
HTTP request
   │
   ▼
routes/v1/*.routes.js      ← URL → middleware chain → controller
   │  authenticate → authorize(role) → validate(zodSchema) → logActivity(action)
   ▼
controllers/*.controller.js ← thin: read req, call service, send envelope
   ▼
services/*.service.js       ← business rules (ownership, slugs, soft delete, token rotation, notifications)
   ▼
models/*.js (Mongoose)      ← schemas, indexes, hooks
```

```
mern-blog-platform/
├── docker-compose.yml              # MongoDB 7
├── package.json                    # root scripts (dev, test, seed)
├── server/
│   ├── scripts/seed.js             # admin + sample data
│   ├── src/
│   │   ├── app.js                  # express app factory (used by tests)
│   │   ├── server.js               # http + socket.io bootstrap
│   │   ├── config/                 # env (zod-validated), db, passport
│   │   ├── controllers/            # auth, post, comment, admin
│   │   ├── middleware/             # authenticate, authorize, validate, rateLimiter, activityLogger, errorHandler
│   │   ├── models/                 # User, Post, Comment, RefreshToken, ActivityLog
│   │   ├── routes/v1/              # auth, posts, comments, users, admin
│   │   ├── services/               # auth, token, post, comment, user, admin, activity, notification
│   │   ├── sockets/                # socket.io server, JWT handshake, rooms
│   │   ├── utils/                  # ApiError, apiResponse, pagination, slug, permissions, constants
│   │   └── validators/             # zod schemas per resource
│   └── tests/{unit,integration}/
└── client/
    └── src/
        ├── api/                    # axios instance + interceptors, resource modules
        ├── context/                # AuthContext, NotificationContext
        ├── hooks/                  # useAuth, useNotifications, usePaginatedQuery, useDebouncedValue
        ├── components/             # Navbar, ProtectedRoute/AdminRoute, PostCard, CommentSection, DataTable…
        └── pages/                  # Home, PostDetail, PostEditor, MyPosts, Login, Register, OAuthCallback
            └── admin/              # AdminLayout, Dashboard, ManageUsers, ManagePosts, ManageComments, ActivityLogs
```

---

## Getting started

### Prerequisites

- Node.js **20+** and npm
- Docker (for MongoDB) — or any MongoDB 6+ instance / Atlas connection string

### 1. Install

```bash
git clone <repo-url> mern-blog-platform
cd mern-blog-platform
npm run install:all          # root + server + client
```

### 2. Configure

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env      # optional — defaults work in development
```

Generate two different JWT secrets and paste them into `server/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start MongoDB and seed data

```bash
npm run db:up                # docker compose up -d mongo
npm run seed                 # creates admin + sample users, posts and comments
```

The seed script prints the login credentials:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@blog.dev` | `Admin@12345` |
| User | `alice@blog.dev` | `User@12345` |
| User | `bob@blog.dev` | `User@12345` |

Use `npm run seed --prefix server -- --reset` to wipe and reseed.

### 4. Run

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5050/api/v1 (the Vite dev server proxies `/api` and `/socket.io`, so the browser talks to a single origin)

> The API uses port **5050** because macOS reserves port 5000 for AirPlay Receiver.

### Social login setup (optional)

The app runs without OAuth credentials. The buttons redirect back to the login page with a "not configured" message.

**Google:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → *Create OAuth client ID* (Web application)
- Authorized redirect URI: `http://localhost:5050/api/v1/auth/google/callback`
- Put the values in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**Facebook:** [Meta for Developers](https://developers.facebook.com/apps) → create an app → add *Facebook Login*
- Valid OAuth redirect URI: `http://localhost:5050/api/v1/auth/facebook/callback`
- Put the values in `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`.

OAuth flow: browser → `/auth/{provider}` → provider consent → `/auth/{provider}/callback` → the server finds or creates the user (linking by email), sets the refresh cookie and redirects to `CLIENT_URL/oauth/callback` → the client calls `/auth/refresh` to obtain the access token.

---

## Environment variables

### `server/.env`

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `5050` | API port |
| `SERVER_URL` | `http://localhost:5050` | Public API URL (used for OAuth callbacks) |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin and OAuth redirect target |
| `MONGO_URI` | — | MongoDB connection string |
| `JWT_ACCESS_SECRET` | — | ≥ 32 chars |
| `JWT_ACCESS_EXPIRES` | `15m` | Access-token lifetime |
| `JWT_REFRESH_SECRET` | — | ≥ 32 chars, different from the access secret |
| `JWT_REFRESH_EXPIRES_DAYS` | `7` | Refresh-token lifetime |
| `AUTH_RATE_LIMIT_MAX` | `10` | Auth requests allowed per window per IP |
| `AUTH_RATE_LIMIT_WINDOW_MIN` | `15` | Rate-limit window |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Optional |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | — | Optional |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@blog.dev` / `Admin@12345` | Used by the seed script |

The config is validated with Zod at startup. The server exits with a clear message if a required variable is missing or too weak.

### `client/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | API base URL (set to the full API URL in production if it is served from another origin) |
| `VITE_SOCKET_URL` | same origin | Socket.io server URL |

---

## Deployment

| Component | Platform |
|---|---|
| React client | **Vercel** (`client/vercel.json`) |
| Express API + Socket.io | **Render** (`render.yaml`) |
| Database | **MongoDB Atlas** |

```text
Browser ──► https://<app>.vercel.app
              ├── /*        → React build (SPA fallback to index.html)
              └── /api/*    → rewritten to https://inkwell-api.onrender.com/api/*

Browser ──► https://inkwell-api.onrender.com/socket.io   (direct WebSocket, authenticated with the access token)
```

**Why proxy `/api` through Vercel?** The refresh token is an `httpOnly` cookie. If the browser called `*.onrender.com` directly, it would be a third-party cookie, which Safari, Brave and incognito modes block, and users would be logged out on every reload. Through the rewrite, the browser only ever talks to the Vercel domain, so the cookie stays first-party and can use `SameSite=Lax`. Socket.io connects to Render directly because Vercel rewrites don't carry WebSockets, and sockets authenticate with the access token rather than a cookie.

### 1. MongoDB Atlas
1. Create a free M0 cluster and a database user.
2. Under *Network Access*, allow `0.0.0.0/0`. Render's free tier has no static outbound IP.
3. Copy the connection string and add a database name, for example `…mongodb.net/mern-blog`.
4. Seed it from your machine:
   ```bash
   MONGO_URI="<atlas-uri>" npm run seed --prefix server
   ```

### 2. Render (API)
1. *New → Blueprint* and select this repo. Render reads `render.yaml`, creates the `inkwell-api` service and generates both JWT secrets.
2. When prompted, fill in:
   - `MONGO_URI`: the Atlas URI
   - `CLIENT_URL` and `SERVER_URL`: **both** set to your Vercel URL, for example `https://inkwell.vercel.app`. `SERVER_URL` is the Vercel URL because OAuth callbacks also go through the rewrite.
   - The OAuth keys (optional)
3. Check `https://inkwell-api.onrender.com/api/v1/health`. If Render assigned a different hostname, update the rewrite destination in `client/vercel.json`.

### 3. Vercel (client)
1. *Add New → Project*, import the repo and set **Root Directory** to `client`.
2. Add the environment variable `VITE_SOCKET_URL=https://inkwell-api.onrender.com`. Leave `VITE_API_URL` unset; it defaults to `/api/v1`.
3. Deploy. If the final Vercel URL differs from what you put in `CLIENT_URL`/`SERVER_URL` on Render, update those and redeploy the API.

### 4. OAuth callback URLs (production)
- Google: `https://<app>.vercel.app/api/v1/auth/google/callback`
- Facebook: `https://<app>.vercel.app/api/v1/auth/facebook/callback`

### Notes
- `TRUST_PROXY_HOPS=2` (Vercel plus Render's load balancer) lets Express resolve the real client IP, so per-IP rate limiting works.
- Render's free instances sleep after about 15 minutes idle, and the first request takes 30–60 s. Open the site shortly before a demo.

---

## Running tests

```bash
npm test                              # server (Jest) + client (Vitest)
npm run test:coverage --prefix server # coverage report
```

Server tests start an in-memory MongoDB, so they need no running database.

| Suite | Covers |
|---|---|
| `integration/auth` | register, bcrypt hashing, duplicate email, validation, login/deactivated, refresh rotation, **reuse detection**, logout revocation, `/me`, OAuth not configured, **rate limits** (429, successful logins not counted, separate refresh budget) |
| `integration/posts` | create + slug, slug collisions, pagination/excerpts, text search, update/slug regen, **owner vs non-owner vs admin**, **soft delete**, my posts |
| `integration/comments` | create, list, deleted post, owner edit, **non-owner 403**, admin delete |
| `integration/admin` | **403 for users / 401 for anonymous on every admin route**, stats, user search, promote + token revocation, self-demotion guard, cascade on delete, restore, purge |
| `integration/activity` | actions are logged; failed requests are not |
| `integration/socket` | JWT handshake, live comment notification to author, admin post notification |
| `integration/errors` | 404 / malformed JSON envelopes |
| `unit/*` | slug, pagination, permissions, `authorize`, `validate`, error mapping, token service, OAuth user linking, notification routing |
| client | `ProtectedRoute` / `AdminRoute` redirects, single in-flight refresh, 401 retry interceptor |

---

## API reference

Base URL: `/api/v1`. 🔒 = requires `Authorization: Bearer <accessToken>`; 👑 = admin only.

### Response format

```jsonc
// success
{ "success": true, "message": "OK", "data": { … }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed",
  "details": [{ "field": "body.title", "message": "Title must be at least 3 characters" }] } }
```

Error codes: `BAD_REQUEST`, `VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND`, `ROUTE_NOT_FOUND` (404) · `CONFLICT` (409) · `TOO_MANY_REQUESTS` (429) · `INTERNAL_ERROR` (500).

### Auth — `/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` → `{ user, accessToken }` + refresh cookie · rate-limited |
| POST | `/auth/login` | `{ email, password }` → `{ user, accessToken }` + refresh cookie · rate-limited |
| POST | `/auth/refresh` | Uses the refresh cookie; rotates it and returns a new access token |
| POST | `/auth/logout` | Revokes the refresh token and clears the cookie |
| GET | `/auth/me` 🔒 | Current user |
| GET | `/auth/google`, `/auth/facebook` | Start OAuth |
| GET | `/auth/google/callback`, `/auth/facebook/callback` | OAuth callbacks |

### Posts — `/posts`

| Method | Path | Description |
|---|---|---|
| GET | `/posts?page&limit&search&author` | Published posts (excerpt only), newest first |
| GET | `/posts/:slug` | Full post + `commentCount` |
| POST | `/posts` 🔒 | `{ title, content }` |
| PATCH | `/posts/:id` 🔒 | Owner or admin · `{ title?, content? }` |
| DELETE | `/posts/:id` 🔒 | Owner or admin · **soft delete** |
| GET | `/posts/:postId/comments?page&limit` | Comments for a post |
| POST | `/posts/:postId/comments` 🔒 | `{ content }` |

### Comments — `/comments`

| Method | Path | Description |
|---|---|---|
| PATCH | `/comments/:id` 🔒 | Owner or admin · `{ content }` |
| DELETE | `/comments/:id` 🔒 | Owner or admin |

### Users — `/users`

| Method | Path | Description |
|---|---|---|
| GET | `/users/me/posts` 🔒 | Current user's posts |

### Admin — `/admin` 🔒👑

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Totals for users, admins, posts, deleted posts and comments, plus recent activity |
| GET | `/admin/users?search&role&page&limit` | List users |
| PATCH | `/admin/users/:id` | `{ role?, isActive?, name? }` (revokes the user's sessions on a role or status change) |
| DELETE | `/admin/users/:id` | Delete user, remove their comments, soft-delete their posts |
| GET | `/admin/posts?includeDeleted&onlyDeleted&search` | All posts |
| DELETE | `/admin/posts/:id` | Soft delete |
| PATCH | `/admin/posts/:id/restore` | Restore a soft-deleted post |
| DELETE | `/admin/posts/:id/permanent` | Hard delete the post and its comments |
| GET | `/admin/comments?post&author` | All comments |
| DELETE | `/admin/comments/:id` | Delete any comment |
| GET | `/admin/activity-logs?action&user` | Activity log |

### Socket.io

Connect with `io(url, { auth: { token: accessToken } })` and listen for `notification`:

```json
{ "type": "COMMENT_CREATED", "message": "Bob commented on \"My post\"", "postSlug": "my-post", "createdAt": "…" }
```

Types: `COMMENT_CREATED` (to the post author), `POST_CREATED` and `USER_REGISTERED` (to admins).

### Example

```bash
curl -c jar -X POST localhost:5050/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@blog.dev","password":"User@12345"}'

curl -X POST localhost:5050/api/v1/posts \
  -H "Authorization: Bearer <accessToken>" -H 'Content-Type: application/json' \
  -d '{"title":"Hello MERN","content":"My first post on Inkwell."}'

curl -b jar -c jar -X POST localhost:5050/api/v1/auth/refresh
```

---

## Design decisions

1. **JavaScript, not TypeScript.** Consistent across the stack, with no build step on the server, which kept the time-boxed assignment focused on behaviour.
2. **CommonJS on the server.** Jest and Supertest run natively, without ESM flags or experimental VM modules. The client uses ESM, as Vite requires.
3. **Refresh-token rotation with reuse detection.** Refresh tokens are JWTs stored only as SHA-256 hashes, grouped into a *family*. Every refresh revokes the old token and issues a new one. If a revoked token is presented again, it was likely stolen, so the whole family is revoked and the user must log in again. A TTL index cleans up expired tokens.
4. **Ownership is enforced in the service layer.** Route middleware handles *role* checks (`authorize('admin')`). *Ownership* ("only the author or an admin may edit") lives in the services (`assertOwnerOrAdmin(resource, actor)`), next to the data, so no route, future controller or UI bug can skip it.
5. **Query performance:**
   - Indexes match the access patterns: `{isDeleted, createdAt}` for the feed, `{author, isDeleted, createdAt}` for "my posts", `{post, createdAt}` for comments, and a weighted text index for search.
   - List endpoints project a 220-character `excerpt` with `$substrCP` instead of shipping full content.
   - Reads use `.lean()`, `populate` selects only `name avatar`, and `find` and `countDocuments` run in parallel.
   - Comments are paginated on their own endpoint rather than populated into posts.
6. **A single in-flight refresh on the client.** The axios interceptor retries a 401 once after refreshing. Concurrent 401s, and React StrictMode's double-mounted effects, share **one** refresh promise. Without that, two parallel refreshes would trip reuse detection and log the user out.
7. **Tests target the business rules.** Integration tests prove auth, RBAC, ownership, soft delete, admin access and notifications over real HTTP against an in-memory MongoDB. Unit tests cover the pure pieces.

Other choices:
- The **access token is kept in memory** (not `localStorage`), so XSS can't read it from storage. The **refresh token is an `httpOnly` cookie** scoped to `/api/v1/auth`.
- **Activity logging** hooks `res.on('finish')`, so it records only successful requests and never delays the response.
- **Express 5** forwards rejected promises from async handlers to the error handler, so no `asyncHandler` wrapper is needed.
- **`createApp(options)`** is a factory, so tests can build an app with a tight rate limit without affecting other suites.

---

## Security notes

- bcrypt with cost 12. Passwords are never selected by default and are stripped from JSON.
- Generic "Invalid email or password" responses, so accounts can't be enumerated.
- Helmet headers, a restricted CORS origin, a 1 MB JSON body limit.
- Rate limiting on auth endpoints: register is limited to 10 requests per 15 min per IP, and login is limited to 10 **failed** attempts per 15 min per IP (both configurable). Token refresh has a 10× larger budget, so normal browsing never trips it. A global API limiter applies on top.
- Role or status changes and deletions revoke all of that user's sessions immediately. Deactivated users are rejected on every request.
- Admins cannot demote, deactivate or delete themselves.
- Clients cannot set `role` at registration (the validation schema strips unknown fields).
- The refresh cookie is `HttpOnly; SameSite=Lax`, and also `Secure` in production. In production the browser reaches the API through the Vercel `/api` rewrite, so the cookie stays first-party and doesn't need `SameSite=None`.
