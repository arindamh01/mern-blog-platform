# Demo video script (≈ 8 minutes)

Before you start, run `npm run seed --prefix server -- --reset` and then `npm run dev`. Open two browser windows: a normal one and an incognito one.

## 1. Intro and architecture — 1:00
- Show the repo tree: `server/src` (routes → controllers → services → models) and `client/src`.
- One sentence per layer. Point at `middleware/` and say every middleware is reusable.

## 2. Public feed — 0:30
- Home page: paginated cards with excerpts, then search "mongodb" (text index).
- Open a post: slug in the URL, author, timestamps, comments.

## 3. Auth — 1:30
- Register a new user and show the inline validation (weak password).
- DevTools → Application → Cookies: the `refreshToken` cookie is `HttpOnly` and its path is `/api/v1/auth`. The access token is not in localStorage.
- Reload the page: you stay logged in (silent refresh).
- Click "Continue with Google". If it isn't configured, explain the friendly redirect. If it is configured, show the full flow.
- Optional: run the curl loop in a terminal to show the 429 from the rate limiter.

## 4. Posts and comments as a user (Alice, normal window) — 1:30
- Create a post. Show the generated slug.
- Edit the title and show that the slug changes.
- Open Bob's post: there are no Edit/Delete buttons. Then curl a PATCH with Alice's token and show the **403 from the API**, which proves the rule is enforced server-side.
- Add, edit and delete your own comment.

## 5. Real-time notifications — 1:00
- Incognito window: log in as **admin**.
- Normal window: Alice publishes a post. The admin sees a toast and the bell badge.
- Admin comments on Alice's post. Alice gets a "commented on" notification.

## 6. Admin panel — 2:00
- Dashboard: totals for users, posts and comments, plus recent activity.
- Users: search, promote Bob to admin, deactivate and reactivate, and note that sessions are revoked.
- Posts: Alice deletes a post (soft delete), the admin switches to the "deleted" filter, restores it, and shows Purge.
- Comments: delete any comment.
- Activity log: filter by `POST_DELETE`.
- As Alice, visit `/admin`: you are redirected (the client guard) and the API returns 403 (the server guard).

## 7. Tests and wrap-up — 0:30
- Run `npm test`: 105 server tests and 10 client tests.
- Run `npm run test:coverage --prefix server`: about 96% line coverage.
- Close with the design decisions from the README: token rotation, service-layer ownership, indexes.
