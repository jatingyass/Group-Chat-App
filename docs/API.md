# API Reference — Group Chat App

Base URL: `http://localhost:5000` (dev) or your deployment URL (prod).

All requests/responses are JSON. All authenticated routes require an `Authorization: Bearer <jwt>` header.

---

## Response Envelope

**Success:**
```json
{ "success": true, "message": "Optional human message", "data": { } }
```

**Error:**
```json
{ "success": false, "message": "Reason", "details": [{ "field": "email", "message": "Invalid email format" }] }
```

---

## Status Codes Used

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 200  | OK                                       |
| 201  | Created                                  |
| 400  | Bad Request (validation failed)          |
| 401  | Unauthorized (missing/invalid JWT)       |
| 403  | Forbidden (e.g., not group admin)        |
| 404  | Not Found                                |
| 409  | Conflict (duplicate email/membership)    |
| 413  | Payload Too Large                        |
| 429  | Too Many Requests (rate limited)         |
| 500  | Internal Server Error                    |

---

## Authentication

### POST `/auth/signup`

Create a new account. Rate-limited to 10 / 15 min.

**Body:**
```json
{
  "name": "Jatin Gyass",
  "email": "jatin@example.com",
  "phone": "9876543210",
  "password": "Strong123"
}
```

**Validation:**
- `name`: 2–50 chars
- `email`: valid email, lowercased server-side
- `phone`: 10–15 digits
- `password`: 8–72 chars, must include upper, lower, digit

**Success 201:**
```json
{ "success": true, "message": "Account created successfully",
  "data": { "id": 1, "name": "Jatin Gyass", "email": "jatin@example.com" } }
```

**Errors:**
- 400 — validation
- 409 — email already exists

---

### POST `/auth/login`

Sign in and get a JWT. Rate-limited to 10 / 15 min.

**Body:**
```json
{ "email": "jatin@example.com", "password": "Strong123" }
```

**Success 200:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "user": { "id": 1, "name": "Jatin Gyass", "email": "jatin@example.com" }
  }
}
```

**Errors:**
- 400 — validation
- 401 — invalid credentials (same message regardless of cause to prevent enumeration)

---

## Groups (all require auth)

### GET `/api/groups`

List the groups the authenticated user is in.

**Success 200:**
```json
{ "success": true, "data": [
  { "id": 1, "name": "IIIT Lucknow", "createdAt": "2026-04-26T10:00:00Z",
    "GroupMembers": [{ "is_admin": true }] }
]}
```

---

### POST `/api/groups`

Create a new group. Creator becomes admin automatically.

**Body:**
```json
{ "name": "Project Team", "members": [2, 3, 4] }
```

`members` is optional; user IDs to add immediately.

**Success 201:**
```json
{ "success": true, "message": "Group created successfully",
  "data": { "id": 5, "name": "Project Team", "createdBy": 1, "createdAt": "..." } }
```

---

### POST `/api/groups/:groupId/invite`

Admin only. Invite a user by email.

**Body:** `{ "email": "newuser@example.com" }`

**Success 200:**
```json
{ "success": true, "message": "User invited successfully",
  "data": { "id": 6, "name": "New User", "email": "newuser@example.com" } }
```

**Errors:**
- 403 — caller is not admin
- 404 — email not registered
- 409 — user already in group

---

### POST `/api/groups/:groupId/promote`

Admin only. Promote a member to admin.

**Body:** `{ "userNameToPromote": "Existing User" }`

**Success 200:** `{ "success": true, "message": "User promoted to admin" }`

---

### POST `/api/groups/:groupId/remove`

Admin only. Remove a member from the group.

**Body:** `{ "userEmailToRemove": "user@example.com" }`

**Success 200:** `{ "success": true, "message": "User removed from group" }`

**Errors:**
- 403 — cannot remove the group creator

---

### GET `/api/groups/:groupId/members`

List all members of a group with their admin status. Caller must be a member.

**Success 200:**
```json
{ "success": true, "data": [
  { "id": 1, "name": "Jatin", "email": "jatin@test.com", "isAdmin": true, "joinedAt": "..." },
  { "id": 2, "name": "Alice", "email": "alice@test.com", "isAdmin": false, "joinedAt": "..." }
] }
```

Sorted: admins first, then by join date ascending.

---

### POST `/api/groups/:groupId/leave`

Self-exit. Caller must be a member; the group creator cannot leave (must transfer or delete the group).

**Success 200:** `{ "success": true, "message": "Left the group" }`

**Errors:**
- 403 — group creator cannot leave

---

## Messages (all require auth + group membership)

### GET `/api/messages/:groupId`

Fetch the latest messages of a group, returned in chronological order.

**Query params:**
- `limit` (int, 1–100, default 50)
- `before` (int, optional) — message id to paginate backwards from

**Success 200:**
```json
{ "success": true, "data": [
  { "id": 101, "userId": 1, "userName": "Jatin Gyass", "groupId": 5,
    "message": "Hello!", "fileUrl": null, "createdAt": "2026-04-26T10:05:00Z" }
] }
```

### POST `/api/messages`

Send a message via REST (alternative to WebSocket). Useful for clients that don't keep a socket.

**Body:**
```json
{ "groupId": 5, "message": "Hi", "fileUrl": null }
```

**Success 201:** the saved message object.

---

### GET `/api/messages/:groupId/archive`

Pulls older messages from the **warm** + **cold** tiers (`ArchivedMessages` and `ColdMessages` tables). Use this for the "Load older messages" UX after the user has scrolled past the hot tier.

**Query params:**
- `before` (unix-millis timestamp, optional, defaults to now) — return rows older than this.
- `limit` (1–100, default 50)

**Success 200:**
```json
{
  "success": true,
  "data": [
    { "id": 42, "userId": 1, "userName": "Jatin", "groupId": 5,
      "message": "older note", "fileUrl": null, "createdAt": "2026-04-01T...",
      "tier": "warm" },
    { "id": 17, "userId": 2, "userName": "Alice", "groupId": 5,
      "message": "ancient", "fileUrl": null, "createdAt": "2026-02-15T...",
      "tier": "cold" }
  ],
  "meta": { "warmCount": 12, "coldCount": 38 }
}
```

Rows are returned in chronological order. Each carries a `tier` field (`"warm"` or `"cold"`) so the UI can render a tier badge.

---

## Files

### GET `/api/files/get-presigned-url`

**Auth required.** Returns an upload URL.

**Query:** `?filename=photo.png&filetype=image/png&filesize=123456`

**Allowed mime types and per-type size limits:**

| Category | MIME types | Max size |
| --- | --- | --- |
| Image | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | 10 MB |
| Video | `video/mp4`, `video/webm`, `video/quicktime` | 100 MB |
| Audio | `audio/mpeg`, `audio/wav`, `audio/webm` | 25 MB |
| Document | `application/pdf`, `application/msword`, `.docx`, `.xls`, `.xlsx`, `text/plain` | 25 MB |
| Archive | `application/zip` | 50 MB |

If `filesize` exceeds the limit for the type, the server returns 413.

**Success 200:**
```json
{ "success": true, "data": {
  "url": "https://bucket.s3.amazonaws.com/uploads/...?X-Amz-Signature=...",
  "fileUrl": "https://bucket.s3.amazonaws.com/uploads/167...",
  "key": "uploads/167...",
  "method": "PUT",
  "maxBytes": 10485760
} }
```

The `url` is valid for 60 seconds. The client uploads via `PUT` (S3 mode → directly to S3; local mode → to `/api/files/upload?key=...`). After upload completes, send a chat message with `fileUrl`, `fileName`, `fileMimeType`, `fileSize` populated.

### PUT `/api/files/upload?key=<key>`

**Auth required. Local-driver only.** Receives raw bytes and writes them under `LOCAL_UPLOAD_PATH`. Max body size 10 MB.

**Success 200:** `{ "success": true, "data": { "fileUrl": "/uploads/<file>" } }`

---

## Health

### GET `/healthz`
Returns `{ "status": "ok", "uptime": <seconds> }`. Used by deployment platforms for liveness probes.

---

## WebSocket Events (Socket.IO)

**Connect:**
```js
const socket = io('http://localhost:5000', {
  auth: { token: '<jwt>' },
  transports: ['websocket', 'polling'],
});
```

A bad token → `connect_error` with message "Invalid or expired token".

### Events

| Event             | Direction          | Payload                                       | Ack                                         |
| ----------------- | ------------------ | --------------------------------------------- | ------------------------------------------- |
| `join-group`      | client → server    | `groupId` (number)                             | `{ ok, error? }`                             |
| `leave-group`     | client → server    | `groupId` (number)                             | `{ ok }`                                     |
| `send-message`    | client → server    | `{ groupId, message, fileUrl? }`               | `{ ok, data?: Message, error? }`             |
| `receive-message` | server → all in room | `Message` (full row)                          | —                                           |
| `typing`          | both ways          | `{ groupId }` from client; `{ userId, userName }` to others | —                              |

**Example:**
```js
socket.emit('join-group', 5, (resp) => console.log(resp));
socket.on('receive-message', (msg) => render(msg));
socket.emit('send-message', { groupId: 5, message: 'Hi' }, (ack) => {
  if (!ack.ok) toast.error(ack.error);
});
```

---

## Rate Limits

| Path                  | Window  | Max requests |
| --------------------- | ------- | ------------ |
| `/auth/*`             | 15 min  | 10           |
| `/api/*`              | 15 min  | 100          |

When exceeded, response is `429 Too Many Requests` with `RateLimit-*` headers.
