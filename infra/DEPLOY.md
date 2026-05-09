# Kria — Production Deployment Guide

## Prerequisites
- Domain `trykria.com` already on Vercel (landing page live)
- AWS account with EC2 access
- Apple Developer account (for iOS) / Google Play Console (for Android)

Everything in this guide runs either in a browser or on the EC2 server — no local commands needed.

---

## 1. EC2 — Launch Instance

### 1a. Launch

1. AWS Console → EC2 → Launch Instance
   - Name: `kria-api`
   - AMI: **Ubuntu Server 24.04 LTS** (64-bit x86)
   - Instance type: **t3a.medium** (4 GB RAM, 2 vCPU, ~$27/mo)
   - Key pair: create or select existing → download the `.pem` file
   - Security group — create new with these inbound rules:

     | Type  | Port | Source    |
     |-------|------|-----------|
     | SSH   | 22   | My IP     |
     | HTTP  | 80   | 0.0.0.0/0 |
     | HTTPS | 443  | 0.0.0.0/0 |

   - Storage: 20 GB gp3
   - Launch

2. Allocate an Elastic IP:
   - EC2 → Elastic IPs → Allocate → Associate with your new instance
   - Note the IP (call it `EC2_IP`)

3. Add DNS record — in your domain registrar add:
   - `A` record: `api` → `EC2_IP`
   - Wait for propagation (`dig api.trykria.com` should return `EC2_IP`)

### 1b. Initial server setup (run once)

SSH in and run the setup script:

```bash
ssh -i your-key.pem ubuntu@EC2_IP

curl -fsSL https://raw.githubusercontent.com/your-org/kriya/main/infra/setup-server.sh | bash

# Log out and back in (for docker group to take effect)
exit
ssh -i your-key.pem ubuntu@EC2_IP
```

This installs Docker, Nginx, Certbot, Fail2ban, UFW, and hardens SSH.

### 1c. Set up Nginx + SSL

```bash
# Clone the repo first
git clone https://github.com/your-org/kriya.git
cd kriya

# Install the Nginx config (HTTP-only — certbot adds SSL next)
sudo cp infra/nginx/api.trykria.com.conf /etc/nginx/sites-available/api.trykria.com
sudo ln -s /etc/nginx/sites-available/api.trykria.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate — certbot patches the config and adds the HTTPS block
sudo certbot --nginx -d api.trykria.com
# Follow prompts — choose to redirect HTTP → HTTPS

sudo nginx -t && sudo systemctl reload nginx
```

---

## 2. Supabase Cloud Setup

Do this in your browser while the EC2 DNS propagates.

### 2a. Create project

Go to [supabase.com](https://supabase.com) → New project:
- Name: `kria-prod`
- Region: `ap-south-1` (Mumbai)
- Set a strong database password — save it, you'll need it for the connection string

### 2b. Get API keys

Go to **Settings → API Keys**:

- **Publishable key** (starts with `sb_publishable_`) → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Grid/Pocket
- **Secret key** (starts with `sb_secret_`) → this is your `SUPABASE_SERVICE_KEY` for the backend

> If you don't see these tabs, check the **Legacy anon, service_role API keys** tab — the old `anon` and `service_role` keys work until end of 2026 and are interchangeable here.

Also on **Settings → API**, scroll down to **JWT Settings** and copy the **JWT Secret** → `SUPABASE_JWT_SECRET`.

And copy the **Project URL** (e.g. `https://xxxxxxxxxxxx.supabase.co`) → `SUPABASE_URL`.

### 2c. Get database connection string

Click the **Connect** button at the top of the Supabase dashboard. Choose:
- Tab: **Direct connection** (best for a persistent EC2 server)
- Copy the URI (e.g. `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres`)
- Replace `[YOUR-PASSWORD]` with your database password
- Change the scheme to `postgresql+asyncpg://` for our async SQLAlchemy driver

Final form:
```
postgresql+asyncpg://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 2d. Configure phone auth (Twilio)

Go to **Authentication → Providers → Phone**:
- Enable phone sign-ins
- Set provider to **Twilio**
- Enter your Twilio Account SID, Auth Token, and Messaging Service SID (same credentials as dev)

---

## 3. Configure & Deploy on EC2

### 3a. Create the production env file

```bash
cd ~/kriya
nano .env.prod
```

Paste and fill in:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
SUPABASE_JWT_SECRET=<JWT Secret from Settings → API → JWT Settings>
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
GOOGLE_MAPS_API_KEY=AIza...
ANTISPOOF_MODEL_ENABLED=False
ENVIRONMENT=production
```

### 3b. Deploy

```bash
bash infra/deploy.sh
```

This pulls the latest code, builds Docker images, starts containers, and runs Alembic migrations automatically.

**First deploy takes ~5 minutes** — Inspector downloads the insightface model (~300 MB).

### 3c. Verify

```bash
# All containers should show "Up"
docker compose -f docker-compose.prod.yml ps

# API responding
curl https://api.trykria.com/health

# Tail logs
docker compose -f docker-compose.prod.yml logs kria-api -f
```

### Future deploys

```bash
ssh -i your-key.pem ubuntu@EC2_IP
cd ~/kriya && bash infra/deploy.sh
```

---

## 4. Grid — Vercel

### 4a. Add DNS record

Since `trykria.com` DNS is managed by Vercel, add the record there:

Vercel dashboard → Domains → `trykria.com` → DNS Records → Add Record:
- Type: `CNAME`
- Name: `grid`
- Value: `cname.vercel-dns.com`

No propagation wait needed — Vercel applies its own DNS records instantly.

### 4b. Deploy

On the EC2 server (or any machine with Node):

```bash
cd ~/kriya/frontend/grid
npm install -g vercel
vercel --prod
```

When prompted: link to existing project or create new, set root directory to `frontend/grid`.

### 4c. Set environment variables

Go to vercel.com → kria-grid project → Settings → Environment Variables. Add for **Production**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (publishable key) |
| `NEXT_PUBLIC_API_URL` | `https://api.trykria.com/api/v1` |

### 4d. Add custom domain

Vercel dashboard → Domains → Add `grid.trykria.com` → Vercel confirms the CNAME.

### 4e. Redeploy to pick up env vars

```bash
cd ~/kriya/frontend/grid && vercel --prod
```

### Future deploys

```bash
cd ~/kriya/frontend/grid && vercel --prod
```

Or connect the GitHub repo to Vercel for auto-deploy on push to `main`.

---

## 5. Pocket — EAS Build

### 5a. One-time setup

On the EC2 server (or any machine with Node):

```bash
cd ~/kriya/frontend/pocket
npm install -g eas-cli
eas login
eas init   # links to your Expo account, updates app.json projectId
```

Fill in the real API URL in `eas.json` — it's already set to `https://api.trykria.com` in the `preview` and `production` profiles.

### 5b. Android APK (beta / internal testing)

Produces a `.apk` you can share directly — no Play Store needed.

```bash
eas build --platform android --profile preview
```

EAS builds in the cloud (~10 min). Download link appears when done.

### 5c. iOS TestFlight (beta)

Requires Apple Developer account ($99/yr).

```bash
eas build --platform ios --profile preview
eas submit --platform ios --profile production
```

### 5d. Production (both stores)

```bash
eas build --platform all --profile production
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

For Android submit you need a `google-services-key.json` from Play Console.
For iOS submit you need `appleId`, `ascAppId`, `appleTeamId` filled in `eas.json`.

---

## Security Checklist (verify before DNS cutover)

```
[ ] SSH: key-only auth enabled, PasswordAuthentication no in sshd_config
[ ] SSH: port 22 restricted to your IP in AWS Security Group
[ ] UFW: enabled, only 22/80/443 open
[ ] Fail2ban: running (systemctl status fail2ban)
[ ] HTTPS: certbot cert installed, HTTP redirects to HTTPS
[ ] Nginx: rate limiting active (limit_req_zone in config)
[ ] Nginx: security headers present (X-Frame-Options, HSTS, etc.)
[ ] Nginx: client_max_body_size 10M (for ID image uploads)
[ ] Inspector: no port mapped to host (docker compose ps shows no 0.0.0.0:xxxx for inspector)
[ ] CORS: production origins set to trykria.com and grid.trykria.com only
[ ] SUPABASE_SERVICE_KEY: not in any git commit (run: git log -S "sb_secret_")
[ ] .env.prod: not tracked by git (run: git status — should not appear)
[ ] Unattended upgrades: enabled
[ ] API health check passing: curl https://api.trykria.com/health
```

---

## Cost Summary (monthly)

| Service | Cost |
|---------|------|
| EC2 t3a.medium | ~$27 |
| Elastic IP | Free (while attached) |
| EBS 20 GB gp3 | ~$1.60 |
| Supabase Cloud | Free (up to 500 MB DB) |
| Vercel (Grid) | Free |
| EAS Build | Free (up to 1000 min/month) |
| **Total** | **~$29/month** |
