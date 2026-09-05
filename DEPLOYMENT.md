# PayPilot AI — Production Deployment Guide

> Frontend: Vercel Hobby · Backend: Render Free · Database: Supabase Free

---

## Architecture

```
Browser
  → Vercel (Next.js)          apps/web/
      → Render (FastAPI)      apps/api/
          → Supabase (PostgreSQL)
```

Next.js server-side API routes proxy all requests to Render so the database
credentials and backend URL are never exposed to the browser.

---

## Step 1 — Supabase (Database)

1. Create a free account at https://supabase.com
2. Create a new project (choose a region close to your Render region)
3. Go to **Project Settings → Database → Connection string → URI**
4. Copy the **URI** — it looks like:
   ```
   postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
5. Replace `postgresql://` with `postgresql+psycopg2://` for SQLAlchemy:
   ```
   postgresql+psycopg2://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
6. **Save this URL** — you'll need it for Render.

> ⚠️ Supabase free tier pauses projects after 1 week of inactivity.
> Keep the project active by visiting it periodically.

---

## Step 2 — Render (FastAPI Backend)

1. Create a free account at https://render.com
2. Click **New → Web Service**
3. Connect your GitHub repo: `Aksharmadan/PAYPILOT-AI`
4. Configure:

   | Setting           | Value                                  |
   |-------------------|----------------------------------------|
   | Name              | `paypilot-api`                         |
   | Root Directory    | `apps/api`                             |
   | Environment       | `Python 3`                             |
   | Build Command     | `pip install -r requirements.txt`      |
   | Start Command     | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Plan              | Free                                   |

5. Add **Environment Variables** (in the Render dashboard):

   | Key                        | Value                                                      |
   |----------------------------|------------------------------------------------------------|
   | `DATABASE_URL`             | Your Supabase PostgreSQL URL (from Step 1)                 |
   | `SECRET_KEY`               | A random 64-character string (generate below)              |
   | `CORS_ORIGINS`             | `https://YOUR-APP.vercel.app` (add after Vercel deploy)    |
   | `GROQ_API_KEY`             | Your Groq API key from https://console.groq.com            |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                                                  |
   | `ALGORITHM`                | `HS256`                                                    |

   **Generate SECRET_KEY:**
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

6. Click **Create Web Service**
7. Render will build and deploy. First deploy runs Alembic migrations automatically.
8. Note your service URL: `https://paypilot-api.onrender.com`
9. Test health: `curl https://paypilot-api.onrender.com/health`

> ⚠️ Render free tier spins down after 15 minutes of inactivity.
> First request after sleep takes 30–60 seconds. The frontend handles this gracefully.

---

## Step 3 — Seed the Database

After the first Render deploy (migrations complete), seed synthetic data:

```bash
# From your local machine with the Supabase DATABASE_URL set:
cd apps/api
DATABASE_URL="postgresql+psycopg2://..." python seed_data.py
```

Or via Render Shell (Dashboard → Shell):
```bash
python seed_data.py
```

The seed script is safe to run once — running it again without `--wipe` will
attempt duplicate inserts and may fail on unique constraints (harmless).

---

## Step 4 — Vercel (Next.js Frontend)

1. Create a free account at https://vercel.com
2. Click **New Project → Import Git Repository**
3. Select `Aksharmadan/PAYPILOT-AI`
4. Vercel will detect `vercel.json` at the root and use `apps/web` as root directory
5. Add **Environment Variables** in Vercel dashboard:

   | Key              | Value                                                        |
   |------------------|--------------------------------------------------------------|
   | `API_BASE_URL`   | `https://paypilot-api.onrender.com` (your Render URL)        |

   > Do NOT set `DEV_API_TOKEN` in production.

6. Click **Deploy**
7. Note your Vercel URL: `https://paypilot-ai.vercel.app`

---

## Step 5 — Update CORS on Render

After Vercel deploy completes:

1. Go to Render dashboard → paypilot-api → Environment
2. Update `CORS_ORIGINS` to your actual Vercel URL:
   ```
   https://paypilot-ai.vercel.app
   ```
3. Render will redeploy automatically

---

## Step 6 — Verify the Full Stack

Test this sequence end-to-end:

```bash
# 1. API health
curl https://paypilot-api.onrender.com/health
# Expected: {"status":"ok","service":"paypilot-api","database":"ok"}

# 2. Frontend loads
open https://paypilot-ai.vercel.app

# 3. Login with demo credentials
# Email: demo@paypilot.dev  Password: paypilot-demo

# 4. Check each page works:
# - Command Center (/) 
# - Opportunities (/revenue/opportunities)
# - Customers (/customers)
# - AI Analyst (/copilot)
# - Business Impact (/analytics)
# - Audit Trail (/audit)
```

---

## Environment Variables Reference

### Render (Backend)

| Variable                    | Required | Description                                |
|-----------------------------|----------|--------------------------------------------|
| `DATABASE_URL`              | ✅        | Supabase PostgreSQL connection string       |
| `SECRET_KEY`                | ✅        | JWT signing key — must be random & secret  |
| `CORS_ORIGINS`              | ✅        | Comma-separated allowed origins            |
| `GROQ_API_KEY`              | ✅        | Groq AI API key (for AI Analyst feature)   |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| ✅       | Token lifetime in minutes (1440 = 24h)     |
| `ALGORITHM`                 | ✅        | JWT algorithm (HS256)                      |

### Vercel (Frontend)

| Variable        | Required | Description                              |
|-----------------|----------|------------------------------------------|
| `API_BASE_URL`  | ✅        | Full URL of deployed Render API          |

> ⚠️ NEVER commit real values for these to GitHub.
> Always set them through the Vercel/Render dashboard environment variables UI.

---

## Cold Start Handling

Render free tier sleeps after 15 minutes of inactivity. When the frontend
makes a request to a sleeping backend:

1. The request times out or returns a connection error
2. Dashboard pages show a loading state and retry automatically
3. An "API starting up" banner is shown to the user
4. After 30–60 seconds, the backend wakes and requests succeed

This is handled in `apps/web/components/ui/api-error.tsx`.

---

## Security Checklist

- [x] No secrets in Git history
- [x] `.env` files gitignored
- [x] `SECRET_KEY` set via environment variable (never hardcoded)
- [x] `DATABASE_URL` set via environment variable
- [x] `secure: true` on auth cookies in production
- [x] CORS restricted to specific Vercel origin
- [x] Health endpoint checks database connectivity
- [x] No `--reload` in production uvicorn command
