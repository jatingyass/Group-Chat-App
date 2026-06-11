# Low-Level Design — Group Chat App

DB schema, indexes, query plans, sequence diagrams, and API contracts.

---

## 1. Database Schema

```mermaid
erDiagram
    Users ||--o{ GroupMembers : ""
    Users ||--o{ Messages : ""
    Groups ||--o{ GroupMembers : ""
    Groups ||--o{ Messages : ""
    Messages ||--|| ArchivedMessages : "moved by cron"

    Users {
        int id PK
        string name
        string email UK
        string phone
        string password "bcrypt hash"
        timestamp createdAt
        timestamp updatedAt
    }

    Groups {
        int id PK
        string name
        int createdBy FK
        timestamp createdAt
        timestamp updatedAt
    }

    GroupMembers {
        int id PK
        int groupId FK
        int userId FK
        boolean is_admin "default false"
        int added_by FK
        timestamp createdAt
        timestamp updatedAt
    }

    Messages {
        int id PK
        int userId FK
        string userName "denormalized"
        int groupId FK
        string message "max 2000"
        string fileUrl "nullable"
        timestamp createdAt
    }

    ArchivedMessages {
        int id PK "preserved from Messages.id"
        int userId
        string userName
        int groupId
        string message
        string fileUrl
        timestamp createdAt
    }
```

### 1.1 Index Strategy

| Table             | Index                           | Why                                                          |
| ----------------- | ------------------------------- | ------------------------------------------------------------ |
| `Users`           | UNIQUE (`email`)                | Fast lookup at login + uniqueness                             |
| `GroupMembers`    | UNIQUE (`groupId`, `userId`)    | Prevents duplicate membership at the DB level (race-safe)     |
| `GroupMembers`    | (`userId`)                      | Fast "groups for this user" query                             |
| `Messages`        | (`groupId`, `createdAt`)        | The hot read query: messages of a group in time order         |
| `Messages`        | (`userId`)                      | "All messages by user X" use case                             |

**Why `(groupId, createdAt)` not just `(groupId)`?**
The leftmost-match rule of B-tree indexes: a composite index serves any prefix. `(groupId, createdAt)` accelerates both `WHERE groupId = ?` and `WHERE groupId = ? ORDER BY createdAt`. Adding the second column means MySQL avoids a filesort.

### 1.2 Why denormalize `userName` on Messages

Most reads of a message want to render "<name>: <text>". If we forced a JOIN to `Users` on every read, the index lookup becomes a join. Storing the name at write time:

- Pros: messages render with one index scan, no join
- Cons: if a user changes their name, old messages keep the old name. Acceptable for a chat app (matches WhatsApp/Slack behavior — old messages don't retroactively rename)

### 1.3 Foreign keys + cascading deletes

Defined in `models/index.js`:

- `User → Message` ON DELETE CASCADE — if a user is deleted, their messages go too
- `Group → Message` ON DELETE CASCADE — if a group is deleted, all its messages
- `User → GroupMember` ON DELETE CASCADE — if user deleted, memberships gone
- `Group → GroupMember` ON DELETE CASCADE — if group deleted, all memberships

---

## 2. API Contracts

Full reference in [API.md](./API.md). The contract is:

- All requests/responses are JSON.
- Successful responses: `{ success: true, message?, data }`.
- Errors: `{ success: false, message, details? }`.
- Auth: `Authorization: Bearer <jwt>` header.
- Status codes follow REST conventions (200, 201, 400, 401, 403, 404, 409, 413, 429, 500).

### 2.1 Validation Pipeline

```mermaid
flowchart LR
    Req[Request] --> RL[Rate Limit]
    RL --> Auth["authenticate (if protected)"]
    Auth --> ZP[zod schema validate]
    ZP -->|invalid| EH1["400 Bad Request<br/>+ field errors"]
    ZP -->|valid| Mid[isGroupAdmin / isGroupMember]
    Mid --> Ctrl[Controller business logic]
    Ctrl -->|throws ApiError| EH2[Global error handler]
    Ctrl -->|success| Res[201/200 JSON]
```

---

## 3. Auth Sequences

### 3.1 Token issuance

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant DB as MySQL

    C->>API: POST /auth/login {email,password}
    API->>API: zod validate (loginSchema)
    API->>DB: SELECT * FROM Users WHERE email = ? LIMIT 1
    alt user not found OR password mismatch
        API-->>C: 401 "Invalid email or password"
    else
        API->>API: jwt.sign({id, email}, JWT_SECRET, {expiresIn: 7d, issuer: "group-chat-app"})
        API-->>C: 200 {token, user{id,name,email}}
    end
```

Note: same generic message for both "user not found" and "wrong password" — prevents user enumeration.

### 3.2 Authenticated request

```mermaid
sequenceDiagram
    participant C as Client
    participant Auth as authenticate middleware
    participant DB as MySQL
    participant Ctrl as Controller

    C->>Auth: GET /api/groups (Bearer <jwt>)
    Auth->>Auth: extract Bearer token
    alt no token
        Auth-->>C: 401 "Authentication token missing"
    else
        Auth->>Auth: jwt.verify(token, JWT_SECRET)
        alt invalid/expired
            Auth-->>C: 401 "Invalid token" / "Token expired"
        else
            Auth->>DB: SELECT id,name,email FROM Users WHERE id = ?
            alt user deleted
                Auth-->>C: 401 "User no longer exists"
            else
                Auth->>Ctrl: req.user = {id, name, email}
                Ctrl->>DB: ...
                Ctrl-->>C: 200 + data
            end
        end
    end
```

### 3.3 Socket.IO handshake auth

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Socket.IO Server
    participant DB as MySQL

    C->>S: io.connect({ auth: { token } })
    S->>S: io.use(authMiddleware)
    alt no token
        S-->>C: connect_error "Authentication token missing"
    else
        S->>S: jwt.verify
        S->>DB: User.findByPk(decoded.id)
        alt user missing
            S-->>C: connect_error "User not found"
        else
            S->>S: socket.user = {id, name, email}
            S-->>C: connect (success)
        end
    end
```

---

## 4. Group Operations

### 4.1 Create group (transactional)

```mermaid
sequenceDiagram
    participant Ctrl as Controller
    participant DB as MySQL

    Ctrl->>DB: BEGIN TRANSACTION
    Ctrl->>DB: INSERT INTO Groups(name, createdBy)
    DB-->>Ctrl: groupId
    Ctrl->>Ctrl: build [{me, is_admin:true}, ...members]
    Ctrl->>DB: bulkCreate INTO GroupMembers (ignoreDuplicates)
    alt error during bulkCreate
        Ctrl->>DB: ROLLBACK
        Ctrl-->>API: throws → 500
    else
        Ctrl->>DB: COMMIT
        Ctrl-->>API: 201 + group
    end
```

The transaction guarantees we never have a group without its creator attached as admin.

### 4.2 Invite user (admin only)

```mermaid
sequenceDiagram
    participant C as Client
    participant Auth as authenticate
    participant Adm as isGroupAdmin
    participant Ctrl as inviteUser
    participant DB as MySQL

    C->>Auth: POST /api/groups/:groupId/invite {email}
    Auth->>Auth: verify JWT, set req.user
    Auth->>Adm: next()
    Adm->>DB: SELECT * FROM GroupMembers WHERE groupId,userId,is_admin=1
    alt not admin
        Adm-->>C: 403 "Only group admins..."
    else
        Adm->>Ctrl: next()
        Ctrl->>DB: SELECT * FROM Users WHERE email = ?
        alt user not found
            Ctrl-->>C: 404
        else
            Ctrl->>DB: SELECT * FROM GroupMembers WHERE groupId,userId
            alt already in group
                Ctrl-->>C: 409 "User is already in this group"
            else
                Ctrl->>DB: INSERT INTO GroupMembers (groupId, userId, is_admin=false, added_by=req.user.id)
                Ctrl-->>C: 200 + invited user
            end
        end
    end
```

The unique index on `(groupId, userId)` is the safety net: even if two requests race past the `findOne` check, the DB rejects the second insert.

---

## 5. Messaging Sequence (full lifecycle)

```mermaid
sequenceDiagram
    participant Sender as Client A (sender)
    participant Recv as Client B (receiver)
    participant S as Socket.IO Server
    participant DB as MySQL

    Sender->>S: emit send-message {groupId, message}
    S->>S: validate length 1-2000
    S->>S: ensureMembership (cached set or DB)
    alt not a member
        S-->>Sender: ack { ok: false, error }
    else
        S->>DB: INSERT INTO Messages (userId,userName,groupId,message,fileUrl)
        DB-->>S: row {id, createdAt}
        S->>Recv: io.to('group:<id>').emit('receive-message', row)
        S->>Sender: io.to('group:<id>').emit('receive-message', row)
        S-->>Sender: ack { ok: true, data: row }
    end
```

The sender also receives `receive-message` because they're in the room. The frontend dedups by `id` in `useChat`.

### 5.1 Why persist server-side, not client-side?

- A malicious client could spoof `userId`, `userName`, or `createdAt`.
- The server has the only trusted view of `socket.user.id` from the JWT.
- Persisting on the server also means messages survive a client disconnect mid-send.

---

## 6. File Upload Sequence

### 6.1 S3 driver (production)

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant S3 as S3

    C->>API: GET /api/files/get-presigned-url?filename=foo.png&filetype=image/png
    API->>API: zod validate query
    API->>API: storageService.getUploadUrl()
    API->>API: build sanitized key uploads/<ts>_<rand>_foo.png
    API->>S3: getSignedUrl('putObject', {Bucket, Key, ContentType, Expires:60})
    S3-->>API: signed URL (valid 60s)
    API-->>C: { url, fileUrl, key, method:"PUT" }
    C->>S3: PUT <url> body=<bytes>
    S3-->>C: 200
    C->>API: emit send-message {fileUrl}
```

### 6.2 Local driver (dev)

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant FS as Local Filesystem

    C->>API: GET /api/files/get-presigned-url?filename&filetype
    API-->>C: { url:"/api/files/upload?key=<k>", fileUrl:"/uploads/<file>", method:"PUT" }
    C->>API: PUT /api/files/upload?key=<k> body=<bytes>
    API->>API: read body up to 10MB
    API->>FS: write ./uploads/<file>
    API-->>C: { fileUrl }
```

Same client code. Same `fileUrl` shape. The only difference is the URL the browser PUTs to.

---

## 7. Cron — Daily Archive

```mermaid
flowchart TD
    Start[02:00 trigger] --> Tx[BEGIN TRANSACTION]
    Tx --> Q1["SELECT FROM Messages<br/>WHERE createdAt < NOW() - 1 day"]
    Q1 -->|0 rows| End1[COMMIT, log no-op]
    Q1 -->|N rows| Map[Map to ArchivedMessage rows]
    Map --> Q2[bulkCreate ArchivedMessages]
    Q2 --> Q3[DELETE FROM Messages WHERE same predicate]
    Q3 --> End2[COMMIT, log moved N]
    Q2 -->|error| RB[ROLLBACK]
    Q3 -->|error| RB
    RB --> Log[log error, raise]
```

**Idempotency:** If the job runs twice in a day, the second run finds no rows and is a no-op. Cutoff uses **wall-clock NOW()**, not a stored "last-run" timestamp.

---

## 8. Concurrency / Race Conditions

| Race                                                  | Defense                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Two signups with same email                           | Unique index on `Users.email` → second insert fails with `SequelizeUniqueConstraintError` (mapped to 409 by errorHandler) |
| Two `inviteUser` calls add same user simultaneously   | Unique `(groupId, userId)` index on `GroupMembers` rejects the second      |
| `createGroup` partial — group created but bulkCreate fails | Wrapped in Sequelize transaction → all or nothing                          |
| Archive job middle of write — race between SELECT and DELETE | Same transaction, both queries use the same NOW() cutoff                   |
| Socket disconnect while DB write in flight            | DB write completes, message persists; `receive-message` broadcast still fires to other room members |

---

## 9. Sample Query Plans

```sql
-- Hot read: latest 50 messages of a group
EXPLAIN SELECT * FROM Messages
  WHERE groupId = 42
  ORDER BY createdAt DESC
  LIMIT 50;

-- With composite (groupId, createdAt) index:
-- type=ref, key=idx_messages_groupId_createdAt, rows≈50, Extra: "Backward index scan"
```

```sql
-- Find groups for a user
EXPLAIN SELECT g.* FROM Groups g
  JOIN GroupMembers gm ON gm.groupId = g.id
  WHERE gm.userId = 17;

-- With (userId) index on GroupMembers:
-- gm: type=ref, key=idx_group_members_userId
-- g:  type=eq_ref, key=PRIMARY (joined by groupId)
```

---

## 10. State Transitions

### Group lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: POST /api/groups (creator becomes admin)
    Created --> Active: members invited
    Active --> Active: messages sent
    Active --> Active: members promoted/removed
    Active --> Deleted: group deleted (cascades to GroupMembers, Messages)
    Deleted --> [*]
```

### Message lifecycle

```mermaid
stateDiagram-v2
    [*] --> Live: INSERT INTO Messages
    Live --> Archived: cron @ 02:00 daily (after 24h)
    Archived --> [*]
```
