# Interview Q&A — Group Chat App

50+ questions an interviewer is likely to ask about this project, with answers grounded in the actual code. **Read the linked file before each answer so you can show the line, not just memorize it.**

---

## Architecture & Design

### 1. Walk me through the architecture in 60 seconds.

> A React SPA talks to an Express backend over REST and WebSockets. Express handles auth and group/admin operations; Socket.IO handles real-time messaging. MySQL is the source of truth — both REST and Socket persist via Sequelize. File uploads go through a **driver-based storage service** that's `local` in dev and `S3` in prod. A daily cron archives messages older than 24h to keep the hot table small.

### 2. Why did you separate `app.js` from `server.js`?

> Standard Express pattern. `app.js` configures the Express application — middleware, routes, error handling — but doesn't bind to a port. `server.js` does the boot: connects DB, syncs schema, starts the HTTP server, attaches Socket.IO, registers signal handlers. Tests can `import app` and run supertest against it without listening; multi-instance deployments can replace `server.js` without changing app config.

### 3. How would you scale this to 100k concurrent users?

> Stateless API + Redis pub/sub adapter for sockets (already wired in via `@socket.io/redis-adapter`, gated by `REDIS_URL`), sticky sessions on the LB, MySQL with read replicas, externalized cron with leader election, message persistence offloaded to a queue (Kafka/Redis Streams), and **shard the messages tables by `groupId`** — also already implemented and gated by `SHARD_COUNT`. See [HLD.md §6](./HLD.md#6-scaling) for the diagram.

### 3a. Walk me through your sharding implementation.

> `SHARD_COUNT=1` keeps everything on one DB (default). When set to `>=2`, `SHARD_DBS` lists database names. The shard manager (`config/shards.js`) creates one Sequelize instance per database and exposes `getShardForGroup(groupId)` which routes by `groupId % SHARD_COUNT`. Meta tables (`Users`, `Groups`, `GroupMembers`) live on the meta DB always; only message tables (`Messages`, `ArchivedMessages`, `ColdMessages`) are sharded. Routes that need to write a message call `getMessage(groupId).create(...)`, and the archive crons iterate `allMessageShards()` running independent transactions per shard.

### 3b. Why hash-shard by groupId and not by userId or messageId?

> Three reasons. (1) **Locality**: every chat-room read is "messages of group X" — sharding by group means one query → one shard. (2) **Atomicity is preserved**: a message belongs to exactly one group, so the write is single-shard. (3) **No fan-out** for the hot path. UserId would force fan-out for "messages of group X" because users in that group span every shard. MessageId is too random — you couldn't ever scan a group efficiently.

### 3c. What happens when you go from 2 shards to 4?

> Naive modulo (`groupId % N`) means roughly half the data has to move. Two production-grade fixes: (a) **consistent hashing** — assign groupIds to a 0–2³² ring, only adjacent ranges remap when adding nodes; (b) **virtual shards** — pretend you have 1024 logical shards from day one, map them to physical shards in a small lookup table, adding a physical shard means re-assigning (1024/N − 1024/(N+1)) of the virtual shards. Both let you add capacity without rewriting application logic.

### 4. Why MySQL over MongoDB?

> Three reasons: (1) chat data is highly relational — users, groups, memberships, messages — and joins are easier in SQL. (2) Strong consistency: when I create a group, the founder must be a member or the data is broken; transactions handle this. (3) MySQL is well understood by interviewers and ops teams; Mongo's eventual consistency adds complexity I don't need at this scale.

### 5. Why Socket.IO over native WebSockets?

> Built-in fallbacks (long-polling) for restrictive networks, room abstraction (`group:<id>`), and a Redis adapter for horizontal scaling. The trade-off is bundle size and a non-standard protocol — for a 100x larger system I'd evaluate raw `ws` plus a custom redis pubsub layer.

---

## Database

### 6. Show me the schema.

> See [LLD.md §1](./LLD.md#1-database-schema). Five tables: `Users`, `Groups`, `GroupMembers` (junction with `is_admin`), `Messages`, `ArchivedMessages`.

### 7. Why is there an `ArchivedMessages` (and `ColdMessages`) table?

> Three-tier hot/warm/cold lifecycle. The chat-render query is `SELECT * FROM Messages WHERE groupId = ? ORDER BY createdAt DESC LIMIT 50`. As the table grows, even with the index that query gets slower (more pages, hotter cache pressure). Two crons keep the hot table small:
>
> - **Hot → Warm** (`Messages → ArchivedMessages`) runs daily at 02:00, moves rows older than 24h.
> - **Warm → Cold** (`ArchivedMessages → ColdMessages`) runs Sundays at 03:00, moves rows older than 30 days. Cold rows carry an `archivedAt` so we can later age them out to S3 and delete.
>
> Recent reads stay fast (hot table fits in buffer pool). The "Load older messages" button on the frontend hits `/api/messages/:groupId/archive`, which queries warm first, falls through to cold if needed, and tags each row with `tier: 'warm' | 'cold'` so the UI can show a subtle badge.

### 8. Why a composite index `(groupId, createdAt)` and not just `(groupId)`?

> The hot query orders by `createdAt`. Without the second column, MySQL would index-lookup by `groupId`, materialize matching rows, then *filesort* by `createdAt`. With the composite, the index itself is already sorted by `createdAt` within each `groupId` — MySQL uses a **backward index scan** for `ORDER BY ... DESC LIMIT 50` and never sorts.

### 9. Why is `userName` denormalized on `Messages`?

> To avoid a JOIN to `Users` on every message render. Trade-off: if a user changes their name, old messages keep the old name. That matches WhatsApp / Slack behavior — old messages don't retroactively rename. If we needed retroactive rename, we'd JOIN at read time and accept the slowdown.

### 10. How do you prevent two requests from adding the same user to the same group?

> Two layers: app-level `findOne` check, plus a **unique index on `(groupId, userId)`** at the DB level. The app check makes the common case fast and friendly; the DB constraint is the safety net for the race window between SELECT and INSERT.

### 11. What's a transaction? Show me one in your code.

> A unit of work with ACID properties — Atomic, Consistent, Isolated, Durable. In `controllers/groupController.js:createGroup` I wrap the `Group.create` + `GroupMember.bulkCreate` in `metaDb.transaction(async (t) => ...)`. If the bulkCreate throws, the group insert rolls back, leaving the DB clean. Note: I scope the transaction to `metaDb` specifically because under sharding, transactions can only span a single connection — and both inserts are meta-DB tables.

### 11a. How does the archive cron stay consistent under sharding?

> Each shard's hot→warm move is its own transaction on its own Sequelize instance. The archive service iterates `allMessageShards()` and calls `archiveOnShard(shard, cutoff)` per shard. If shard 0 succeeds and shard 1 fails, shard 0's data is correctly moved and shard 1 retries on the next run (the predicate `createdAt < cutoff` is idempotent). We deliberately don't try to do a "global transaction" — that would require XA/2PC and the operational cost isn't worth it for an archive job.

### 12. Why connection pooling?

> Opening a TCP+TLS+auth handshake to MySQL takes ~50ms. If every HTTP request did that, throughput would tank. The pool keeps N (here 10) live connections; requests acquire one, run their query, return it. Pool exhaustion at high traffic is the next bottleneck — that's where read replicas come in.

---

## Authentication & Security

### 13. Walk me through how login works.

> Client POSTs email/password. We zod-validate, look up the user by email, `bcrypt.compare` the password against the stored hash, then `jwt.sign({id, email}, JWT_SECRET, {expiresIn: '7d'})` — see [loginController.js](../controllers/loginController.js). Client stores the token and attaches it to every subsequent request.

### 14. Why bcrypt with 12 rounds?

> bcrypt's cost factor is exponential — each `+1` doubles the work. 12 is a sweet spot in 2026: ~250 ms per hash on a typical server. Slow enough that an attacker who steals the DB can't brute-force quickly, fast enough to not hurt login UX. We re-evaluate every couple of years as hardware speeds up.

### 15. Why not store passwords in plaintext or with a fast hash like SHA-256?

> Plaintext: catastrophic on a leak. SHA-256: fast — an attacker with a leaked DB and a GPU cracks billions of guesses per second. bcrypt is a **password-hashing function** — slow, salted, GPU-resistant.

### 16. What's a JWT and why did you use it?

> JSON Web Token: a base64-encoded `{header}.{payload}.{signature}` string. The signature is HMAC of header+payload with `JWT_SECRET`. We use it because it's stateless — no session store needed. Trade-off: revocation is hard (you can't "invalidate" a JWT). Mitigation: short TTL (7d) plus a denylist for emergency revocation.

### 17. Where do you store the JWT on the client? What about XSS risk?

> `localStorage`, accessed via [api/axios.ts](../frontend/src/api/axios.ts). XSS risk is real — an attacker who runs JS on our origin could read the token. Mitigations: (1) helmet sets a CSP that makes XSS harder, (2) React auto-escapes by default. For a high-stakes app I'd switch to `httpOnly` cookies and add CSRF tokens.

### 18. How do you prevent brute-force login attacks?

> [middlewares/rateLimiter.js](../middlewares/rateLimiter.js) — `authLimiter` is 10 requests / 15 min per IP on `/auth/*`. Above that, 429. At higher scale I'd add a CAPTCHA after the third failure and store the limiter state in Redis so multiple instances share counters.

### 19. How do you prevent user enumeration on the login endpoint?

> Same generic error message — `"Invalid email or password"` — for both unknown email and wrong password. See [loginController.js:14-19](../controllers/loginController.js). Without that, an attacker can probe your user base by watching error messages.

### 20. How do you authenticate WebSocket connections?

> JWT in the **handshake**, via `socket.handshake.auth.token`. [socketService.js:8-22](../services/socketService.js) verifies it before any event handler runs. Connections without a valid token are rejected. After handshake, `socket.user` is trusted server-side; clients can never spoof userId.

### 21. What's the difference between authentication and authorization?

> Authentication = who are you (verify identity). Authorization = what are you allowed to do (verify permission). Our `authenticate` middleware does the first; `isGroupAdmin`/`isGroupMember` do the second.

### 22. How do you handle the leak of an AWS access key?

> [confession from the v1 of this project] My `.env` was committed and the keys were scraped within minutes. The fix: **rotate immediately** (regenerate keys + delete old ones), **rewrite git history** with `git filter-repo --invert-paths --path .env --force`, **force-push** to overwrite the remote. Long-term: pre-commit hook (`gitleaks`/`trufflehog`) and a secrets manager (AWS Parameter Store / Vault) instead of `.env`.

### 23. Why does the file-upload endpoint require auth?

> In v1 it didn't, which meant any internet user could request a presigned S3 PUT URL — a free file dump. Fixed in v2: `/api/files/get-presigned-url` is behind `authenticate` middleware.

---

## API Design

### 24. Why are your error responses uniform?

> Every error returns `{ success: false, message, details? }`. Frontend has one error-handling code path. The global error handler in [middlewares/errorHandler.js](../middlewares/errorHandler.js) maps Sequelize, JWT, and our custom `ApiError`s into this shape.

### 25. How do you validate input?

> [zod](../validation/) schemas. The `validate(schema, source)` middleware [middlewares/validate.js](../middlewares/validate.js) parses each request — replacing the source with the typed/parsed value — or rejects with 400 + per-field details. Schema lives next to the route, single source of truth.

### 26. Why zod over Joi or Yup?

> Zod is TS-native — `z.infer<typeof schema>` gives me the TypeScript type for free. I don't have to keep a runtime schema and a TS type in sync.

### 27. How do you paginate messages?

> Cursor-based, not offset. The query string takes `limit` and `before` (last message id). [groupController.js:getGroupMessages](../controllers/groupController.js) does `WHERE id < before`. Cursor pagination is stable under concurrent inserts; offset pagination shifts results when new rows are inserted.

### 28. Why versioned URL paths or not?

> Currently I haven't versioned (`/api/groups` not `/api/v1/groups`). For an early-stage project, single-version is fine — keeping a /v1 prefix is just noise. Once we ship breaking changes to mobile clients we can't force-update, we'll add `/v2/*` and run both paths in parallel.

---

## Real-time Layer

### 29. Walk me through what happens when a user sends a message.

> Client emits `send-message {groupId, message}`. Server validates length, checks cached membership for that groupId. If allowed, INSERT into `Messages`, then `io.to('group:<id>').emit('receive-message', row)` broadcasts to everyone in the room — including the sender. Client de-dups by message id. Acknowledgement callback returns ok+data so the sender knows it persisted.

### 30. Why persist messages on the server, not the client?

> Three reasons. (1) **Trust** — a malicious client could lie about userId/userName. Server uses `socket.user.id` from the verified JWT. (2) **Order** — DB autoincrement gives a server-side total order; no clock skew between clients. (3) **Durability** — if the sender crashes mid-broadcast, the message is already saved.

### 31. How do you scale Socket.IO horizontally?

> Add `@socket.io/redis-adapter`. When instance A receives `send-message`, it does `io.to(room).emit(...)` which the adapter publishes to Redis. Instance B is subscribed and re-emits to its local sockets in that room. Without the adapter, B would never see A's broadcast.

### 32. Why do you need sticky sessions for WebSockets?

> The `WebSocket` upgrade is a *separate* request from the polling handshake. If the LB sends them to different instances, the connection breaks. Sticky sessions (cookie / IP hash) pin both to the same instance.

### 33. How do you implement typing indicators efficiently?

> Sender throttles to 1 event / 1.5s — we don't need to fire on every keystroke. Receivers maintain a per-user timeout (2.5s) — if no `typing` event for 2.5s, we drop the user from the typing list. Code in [hooks/useChat.ts](../frontend/src/hooks/useChat.ts).

### 34. What happens if the network drops mid-send?

> Socket.IO auto-reconnects (10 attempts, exponential backoff up to 5s — see [api/socket.ts](../frontend/src/api/socket.ts)). After reconnect, client re-emits `join-group`. There's no re-sync of missed messages in the current implementation — if I needed that, I'd query `GET /api/messages/:groupId?after=<lastSeenId>` on reconnect.

---

## Reliability & Operations

### 35. What is graceful shutdown and why does it matter?

> When Render/k8s redeploys, it sends SIGTERM. If we just `process.exit(0)`, in-flight HTTP requests die mid-response and DB writes can be left incomplete. [server.js:33-50](../server.js) catches SIGTERM, calls `server.close()` (stop accepting new requests), then `sequelize.close()`, then exits. A 10-second force-exit timer guarantees we don't hang forever.

### 36. What does `trust proxy` do?

> Render/Railway/Nginx forward client requests with `X-Forwarded-For: <real-client-ip>`. Without `app.set('trust proxy', 1)`, Express thinks the client is the proxy and `req.ip` is wrong. That breaks rate limiting (everyone counts as one IP) and access logs.

### 37. How do you do health checks?

> `/healthz` returns `{ status: 'ok', uptime }`. Render polls this; if it fails repeatedly the platform restarts the container. The Dockerfile also has a `HEALTHCHECK` directive for local Docker.

### 38. How do you log?

> [winston](../utils/logger.js) with JSON format in production (machine-parseable for CloudWatch/Datadog) and colorized text in dev. I never use `console.log` in committed code. Each log line includes timestamp + level + message; for higher-stakes prod I'd add a request-id middleware so logs across HTTP and Socket can be correlated.

### 39. How would you debug a "messages aren't appearing for some users" bug?

> (1) Reproduce with a fresh browser/socket session. (2) Watch server logs for `socket connected: user=...` — does the affected user actually connect? (3) Check `join-group` ack — was membership confirmed? (4) Inspect `EXPLAIN` on the messages query if reads look slow. (5) Check Redis adapter health if multi-instance. (6) Increase log level to `debug` to see Sequelize queries.

### 40. What metrics would you put in production?

> Request rate per route, p50/p95/p99 latency per route, error rate (5xx, 4xx), active socket connections, message rate per minute, DB connection-pool utilization, archive-cron last-run + duration, deploy version. Exposed via `prom-client` to Prometheus, dashboarded in Grafana.

---

## Code Quality

### 41. Walk me through your error-handling pattern.

> Controllers throw `ApiError.badRequest(...)` etc. — these are operational errors with HTTP status codes. The `catchAsync` wrapper auto-forwards rejected promises to Express's `next`. The global error handler ([middlewares/errorHandler.js](../middlewares/errorHandler.js)) maps Sequelize errors, JWT errors, and `ApiError`s to a uniform JSON response. Stack traces are returned in dev, hidden in prod.

### 42. Why don't you have try/catch in every controller?

> `catchAsync` does it once — wraps the async fn, catches any rejection, and forwards to `next`. DRY. Without it, every controller would need an identical try/catch boilerplate.

### 43. How do you keep the code organized?

> Layered: `routes/` defines HTTP shape, `controllers/` orchestrates, `services/` does I/O (storage, archive, socket), `models/` define DB shape, `middlewares/` are cross-cutting concerns (auth, rate-limit, validation), `validation/` holds zod schemas, `utils/` holds pure helpers. Anything you might unit-test in isolation lives in `services/` or `utils/`.

### 44. What testing would you add?

> (1) Unit tests for `services/` — pure logic, easy. (2) Integration tests for controllers via supertest, using a test MySQL via docker-compose. (3) Socket integration tests with a `socket.io-client` instance. (4) E2E with Playwright against the running app. CI: run unit + integration on PR, E2E on merge to main.

### 45. What's the most subtle bug you fixed?

> The `inviteUser` controller used to create the GroupMember row *before* a (broken) admin check — meaning anyone could invite users. I rewrote it: route-level `isGroupAdmin` middleware runs before the controller, and the unique index `(groupId, userId)` prevents duplicate inserts even under concurrent requests.

### 46. What would you refactor if you had another week?

> (1) Move SQL away from auto-`sync` to **migrations** (`umzug` or `sequelize-cli`) — required for prod. (2) Add **integration tests** with supertest. (3) **Refresh tokens** — current 7d JWT means a stolen token is dangerous; refresh tokens with rotation are safer. (4) **Redis pub/sub adapter** so I can run multiple instances. (5) **Pre-commit hook** to scan for secrets (`gitleaks`).

---

## Specific Code Questions

### 47. Why do you fetch the user from DB inside `authenticate`, when the JWT already has `id`?

> The JWT proves the user *was* valid when the token was issued. The DB lookup confirms they still exist (deleted/banned users get blocked). Cost is one extra query per authenticated request — acceptable for chat scale, optimizable with a Redis cache for high-RPS APIs.

### 48. Why a `Set` for cached memberships on the socket?

> O(1) lookup. Each `send-message` checks `socket._memberships.has(groupId)`. If we used an array, lookup would be O(n). Memory is per-socket and tiny — sets win.

### 49. Walk me through the storage driver pattern.

> [services/storageService.js](../services/storageService.js). Both drivers expose the same `getUploadUrl({filename, filetype})` returning `{url, fileUrl, key, method}`. Frontend code is **identical** regardless of which driver is active. `STORAGE_DRIVER` env var picks at startup. Useful because dev runs without AWS but prod uses S3.

### 50. Why do you sanitize filenames before passing to S3 / disk?

> Two reasons. (1) Path traversal — `../../etc/passwd` would write outside the uploads dir on the local driver. (2) Special characters in keys make S3 URLs ugly and sometimes break clients. The `sanitizeFilename` regex strips `/\?%*:|"<>` and clamps length.

### 51. Why is the cron file imported AFTER `connect()` in `server.js`?

> The cron job hits `Message`/`ArchivedMessage` models which require `sequelize` to be initialized. Importing it earlier could trigger a query before the connection is up.

---

## System Design Stretch Questions

### 52. How would you add typing indicators that survive page reload?

> Currently typing state is ephemeral and dies on disconnect. To survive reload, store `lastTypingAt` per user per group in Redis with a TTL of 5s. On every `typing` event, refresh the TTL. On reconnect, a client fetches the redis state for groups it just rejoined. The Mongo/MySQL store is the wrong tool — TTL state is what Redis is for.

### 53. How would you add read receipts?

> New table `MessageReads(messageId, userId, readAt)`. Client emits `mark-read {messageId}` when a message scrolls into view. Server INSERTs (idempotent unique index on `(messageId, userId)`). Broadcast `read-receipt` to the room. Use a debounce on the client so rapid scrolling doesn't spam.

### 54. How would you support 1:1 DMs?

> Treat a DM as a Group of size 2 with a flag `is_direct`. Querying `WHERE is_direct=true AND member1=A AND member2=B` finds existing DMs. The send-path is identical — no separate code.

### 55. How would you add full-text search across messages?

> Two options. (1) MySQL FULLTEXT index on `Messages.message` — works but limited. (2) Stream changes via Kafka Connect to **Elasticsearch** — vastly better relevance and language analysis, at the cost of operating a search cluster. Pick (1) for MVP, plan for (2) once search becomes a feature people use.

### 56. What happens at the moment of sending if the user was just removed from the group?

> The send-path uses cached membership on the socket. If the admin removes them, the cache is stale until the socket reconnects. Two ways to fix: (a) on `removeMember`, also emit a `force-refresh` to that user's sockets so they invalidate the cache; or (b) skip the cache and re-query DB on every send (simpler, slower). For high-trust dev I prefer (a).

### 57. How would you add message editing?

> Add `editedAt` and `originalMessage` columns. Endpoint `PATCH /api/messages/:id` checks `req.user.id === message.userId`. Broadcast `message-edited` so clients update their UI. To prevent abuse: limit to N edits, only allow within Y minutes of send.

---

## Behavioral / Project Questions

### 58. What's the biggest lesson from this project?

> **Don't commit `.env`.** I leaked AWS keys in the v1 history; bots scraped them in minutes and AWS banned my account. Now `.env` is in `.gitignore`, `.env.example` is the committed template, and zod fails fast at startup if any required key is missing. Pre-commit secret scanning is the next layer.

### 59. What did you find hardest?

> Designing the storage abstraction so the same client code works for local FS and S3. The mental model — what URL does the client PUT to, what URL serves the file later — is the same in both modes only if you abstract carefully. Once that clicked, dev/prod parity got easy.

### 60. If you redid this project from scratch, what would you change?

> (1) TypeScript on the backend, not just the frontend. (2) Migrations from day one instead of `sequelize.sync({ alter: true })`. (3) Postgres instead of MySQL — better concurrency primitives (`SKIP LOCKED`, partial indexes, JSONB). (4) Refresh tokens. (5) Redis from day one — pub/sub for sockets, rate-limit store, typing state. (6) Tests from day one (TDD), not bolted on at the end.

---

## Tip for the interview

For each of these, **open the relevant file in your editor before answering**. Pointing at a specific line of *your own* code is dramatically more credible than reciting an abstract answer.
