# Deployment Guide — Email Gate on Ubuntu + Caddy

## Architecture

```
Browser
  │
  ▼
Caddy (ports 80 / 443 — TLS managed automatically)
  ├── /                  → serves email-gate static SPA (from disk)
  ├── /api/              → reverse-proxies to Node.js API server (port 3000)
  ├── /site/             → reverse-proxies to Node.js API server (port 3000)
  ├── /assets/           → reverse-proxies to Node.js API server (port 3000)
  └── /documents/        → reverse-proxies to Node.js API server (port 3000)

Node.js API Server (port 3000, managed by systemd)
  ├── POST /api/auth/email   validates email domain, logs to PostgreSQL
  ├── GET  /site/            serves protected website (with path-fix injection)
  ├── GET  /assets/          serves protected site's CSS/JS assets
  └── GET  /documents/       serves PDF/document downloads

PostgreSQL
  └── email_access_log table
```

---

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- A domain name pointed at the server's IP (required — Caddy provisions TLS via DNS)
- SSH access with sudo privileges

---

## Step 1 — Install Server Dependencies

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Caddy (official repo)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify versions
node --version    # should be v20.x
caddy version
psql --version
```

---

## Step 2 — Set Up PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE emailgate;
CREATE USER emailgate_user WITH PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE emailgate TO emailgate_user;
\c emailgate
GRANT ALL ON SCHEMA public TO emailgate_user;
\q
```

Create the required table:

```bash
sudo -u postgres psql -d emailgate
```

```sql
CREATE TABLE IF NOT EXISTS email_access_log (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Your `DATABASE_URL` will be:
```
postgresql://emailgate_user:choose-a-strong-password@localhost:5432/emailgate
```

---

## Step 3 — Build the Application

On your **local machine** (where you have the source code):

```bash
# From the repo root
bash deploy/build.sh
```

This produces a `dist-deploy/` folder:
```
dist-deploy/
├── api-server/
│   ├── dist/index.mjs      ← compiled Node.js server (single file, no node_modules needed)
│   └── public/             ← protected static website
└── email-gate/
    └── public/             ← compiled email-gate SPA
```

---

## Step 4 — Transfer Files to the Server

```bash
# Create the target directory on the server
ssh user@your-server "sudo mkdir -p /opt/email-gate && sudo chown $USER /opt/email-gate"

# Upload the built files (run from your local machine, note the trailing slash)
rsync -avz dist-deploy/ user@your-server:/opt/email-gate/

# Also transfer the deploy config files
rsync -avz deploy/ user@your-server:/opt/email-gate/deploy/
```

---

## Step 5 — Configure Environment Variables on the Server

```bash
# Create the secrets directory
sudo mkdir -p /etc/email-gate
sudo chmod 750 /etc/email-gate

# Create the environment file
sudo tee /etc/email-gate/env > /dev/null <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://emailgate_user:choose-a-strong-password@localhost:5432/emailgate
RESEND_API_KEY=re_your_resend_api_key_here
NOTIFICATION_EMAIL=you@example.com
COOKIE_SECRET=$(openssl rand -hex 32)
EOF

# Restrict access (caddy runs as caddy user; api server runs as www-data)
sudo chown root:www-data /etc/email-gate/env
sudo chmod 640 /etc/email-gate/env
```

---

## Step 6 — Install and Start the API Server (systemd)

```bash
# Copy the service file
sudo cp /opt/email-gate/deploy/email-gate-api.service /etc/systemd/system/

# Give www-data ownership of the app files
sudo chown -R www-data:www-data /opt/email-gate/api-server

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable email-gate-api
sudo systemctl start email-gate-api

# Check it started cleanly
sudo systemctl status email-gate-api

# Confirm it's listening on port 3000
curl http://localhost:3000/api/healthz
# Expected: {"status":"ok"}
```

---

## Step 7 — Configure Caddy

```bash
# Give Caddy read access to the email-gate static files
sudo chown -R caddy:caddy /opt/email-gate/email-gate/public

# Back up Caddy's default config
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak

# Install the email-gate Caddyfile
sudo cp /opt/email-gate/deploy/Caddyfile /etc/caddy/Caddyfile

# Edit it — replace "your-domain.com" with your actual domain
sudo nano /etc/caddy/Caddyfile

# Validate the config
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy (it will obtain a TLS certificate automatically)
sudo systemctl reload caddy
sudo systemctl status caddy
```

Your site is now live at `https://your-domain.com` — no Certbot step needed.
Caddy handles certificate issuance and renewal automatically.

---

## Deploying Updates

```bash
# 1. On your local machine — rebuild
bash deploy/build.sh

# 2. Transfer the new build
rsync -avz dist-deploy/ user@your-server:/opt/email-gate/

# 3. On the server — restart the API server
sudo systemctl restart email-gate-api

# Caddy does not need to restart for static file changes.
```

---

## Viewing Access Logs

Every authorized login is recorded in PostgreSQL:

```bash
sudo -u postgres psql -d emailgate -c \
  "SELECT id, email, accessed_at FROM email_access_log ORDER BY accessed_at DESC LIMIT 50;"
```

---

## Troubleshooting

| Symptom | Where to look |
|---|---|
| 502 Bad Gateway | API server isn't running — `sudo systemctl status email-gate-api` |
| 404 on `/site/` | Confirm port 3000 is up: `curl http://localhost:3000/api/healthz` |
| Gate not showing | Check Caddy root path in Caddyfile — must point to `/opt/email-gate/email-gate/public` |
| DB connection error | Verify `DATABASE_URL` in `/etc/email-gate/env` and PostgreSQL is running |
| Auth email fails | Check API logs: `sudo journalctl -u email-gate-api -n 100` |
| TLS not provisioning | Ensure port 80 and 443 are open and the domain resolves to this server's IP |
| Caddy errors | `sudo journalctl -u caddy -n 50` |

### Firewall (UFW)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp    # HTTP/3 (QUIC) — optional but recommended
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```
