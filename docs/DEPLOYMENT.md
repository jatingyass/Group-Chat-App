# Free-Tier Deployment Guide

How to host the Group Chat App online for free (no credit card needed for most options).

Recommended stack:

| Component | Provider     | Free tier                           |
| --------- | ------------ | ----------------------------------- |
| Backend   | Render       | 750 hrs/mo, sleeps after 15 min idle |
| MySQL     | Aiven        | 1 GB free MySQL                      |
| Frontend  | Vercel       | Unlimited static + serverless        |
| Files     | MinIO (self-host on Render) or Cloudinary |    |

Alternative: **Railway** (single platform, $5/mo free credit), or **Fly.io** for everything in Docker.

---

## 1. Push code to GitHub

Once history is cleaned (see "Clean leaked secrets from git" below), push:

```bash
cd "d:/Jatin/SDE/SDE Projects/Group-Chat-App"
git add .
git commit -m "v2: refactor backend + react frontend + docs"
git push origin main
```

---

## 2. Create the database (Aiven free MySQL)

1. Sign up at https://aiven.io (no credit card needed for the free tier).
2. **Create service → MySQL → Free tier (us-east-2 or eu-west-1)**.
3. Wait ~3 min for the cluster to start.
4. Copy the connection details:
   ```
   Host: <something>.aivencloud.com
   Port: 24xxx
   User: avnadmin
   Password: <generated>
   Default DB: defaultdb
   ```
5. (Optional) Create a database named `group_chat`:
   ```bash
   mysql -h <host> -P <port> -u avnadmin -p
   > CREATE DATABASE group_chat CHARACTER SET utf8mb4;
   ```

---

## 3. Deploy backend to Render

### 3.1 Create a Web Service

1. Sign in at https://render.com with GitHub.
2. **New → Web Service → Connect repo `Group-Chat-App`**.
3. Configure:
   - **Root directory:** *(blank — repo root)*
   - **Environment:** `Node`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Region:** Singapore or Oregon (closest to your users)
   - **Plan:** Free
4. **Health check path:** `/healthz`

### 3.2 Add environment variables

Render → service → **Environment** tab, paste these:

```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://<your-vercel-app>.vercel.app
DB_HOST=<aiven-host>
DB_PORT=<aiven-port>
DB_NAME=group_chat
DB_USER=avnadmin
DB_PASSWORD=<aiven-password>
JWT_SECRET=<generate with: openssl rand -base64 64>
JWT_EXPIRES_IN=7d
STORAGE_DRIVER=local
LOCAL_UPLOAD_PATH=/opt/render/project/src/uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

> Render's free tier has ephemeral disk — uploads in `local` mode disappear on restart. For prod, use S3/Cloudinary.

### 3.3 Click **Create Web Service**

Render builds and deploys. After ~5 min, your backend lives at `https://<name>.onrender.com`.

**Test it:**
```bash
curl https://<name>.onrender.com/healthz
# {"status":"ok","uptime":12.3}
```

---

## 4. Deploy frontend to Vercel

1. Sign in at https://vercel.com with GitHub.
2. **Add New → Project → Import `Group-Chat-App`**.
3. Configure:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite
   - **Build command:** `npm run build` (default)
   - **Output directory:** `dist` (default)
4. Environment variables:
   ```
   VITE_API_URL=https://<your-render-backend>.onrender.com
   ```
5. **Deploy.**

After ~2 min, your app is at `https://<your-project>.vercel.app`.

### 4.1 Update CORS_ORIGIN on Render

Once Vercel is live, go back to Render → environment → set:

```
CORS_ORIGIN=https://<your-project>.vercel.app
```

Save. Render redeploys automatically.

---

## 5. Optional: free file storage (Cloudinary)

For real file uploads, the cheapest option that doesn't require credit card is Cloudinary:

1. Sign up at https://cloudinary.com (free 25 GB).
2. Get your `cloud_name`, `api_key`, `api_secret` from the dashboard.
3. Cloudinary has an S3-compatible API. Set on Render:
   ```
   STORAGE_DRIVER=s3
   AWS_ACCESS_KEY_ID=<cloudinary-api-key>
   AWS_SECRET_ACCESS_KEY=<cloudinary-api-secret>
   AWS_BUCKET_NAME=<cloud_name>
   AWS_REGION=us-east-1
   AWS_S3_ENDPOINT=https://api.cloudinary.com/v1_1/<cloud_name>
   AWS_S3_FORCE_PATH_STYLE=true
   ```

(Or just keep `local` — files are ephemeral but the app works for demo.)

---

## 6. Custom domain (optional)

- **Vercel** → Settings → Domains → add e.g. `chat.yourname.dev` → follow DNS instructions.
- **Render** → Settings → Custom Domains → add `api.yourname.dev`.

Update `CORS_ORIGIN` and `VITE_API_URL` accordingly.

---

## 7. Monitoring

- **Render** → Logs tab — full app output streamed live.
- **Vercel** → Deployments → click any → Logs.
- For 24×7 uptime ping (counters Render's 15-min sleep):
  - Use https://uptimerobot.com (free) to GET `/healthz` every 5 min.

---

## 8. Cleaning leaked secrets from git history

> Required if `.env` was ever committed.

```bash
# Install git-filter-repo (Python)
pip install git-filter-repo

# From repo root: remove .env from every commit
git filter-repo --invert-paths --path .env --force

# Re-add the GitHub remote (filter-repo strips it)
git remote add origin https://github.com/jatingyass/Group-Chat-App.git

# Force-push the cleaned history (overwrites GitHub)
git push --force --all
git push --force --tags
```

After this, the leaked keys are no longer visible to anyone cloning the repo. Anyone who already cloned has the old history; rotate the leaked credentials regardless.

**Verify:**
```bash
git log --all -p | grep -i "AKIA" | head
# (should be empty)
```

---

## 9. Troubleshooting

| Symptom                              | Fix                                                                 |
| ------------------------------------ | ------------------------------------------------------------------- |
| "JWT_SECRET must be at least 32..."   | Render env var too short. Regenerate.                              |
| "Database connection failed"         | Aiven host/port/credentials mismatch, or service still starting.    |
| CORS errors in browser console        | `CORS_ORIGIN` doesn't match the Vercel URL. Update on Render.       |
| WebSocket disconnects every 15 min   | Render free tier sleeps. Add UptimeRobot ping or upgrade.           |
| 503 on first request after idle      | Cold start (Render). First hit takes ~30s.                          |
| Uploads disappear after redeploy     | Render disk is ephemeral. Move to Cloudinary/S3.                    |

---

## Costs at this scale

| Service       | Free tier ceiling                | When to upgrade               |
| ------------- | -------------------------------- | ----------------------------- |
| Render Web    | 750 hrs/mo                       | When you have real traffic    |
| Aiven MySQL   | 1 GB                             | When dataset > 800 MB         |
| Vercel        | 100 GB bandwidth                 | Almost never for a side project |
| Cloudinary    | 25 GB                            | When media library grows      |

For a portfolio/interview project, **everything stays free**.
