# Deployment Guide — Email Gate on Ubuntu + NGINX

## Architecture

```
Browser
  │
  ▼
NGINX (port 80 / 443)
  ├── /                  → serves email-gate static SPA (from disk)
  ├── /api/              → proxies to Node.js API server (port 3000)
  ├── /site/             → proxies to Node.js API server (port 3000)
  ├── /assets/           → proxies to Node.js API server (port 3000)
  └── /documents/        → proxies to Node.js API server (port 3000)

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
- A domain name pointed at the server's IP (optional — you can use the IP for testing)
- SSH access with sudo privileges

---

## Step 1 — Install Server Dependencies

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install NGINX
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify versions
node --version    # should be v20.x
pnpm --version
nginx -v
psql --version
```

---

## Step 2 — Set Up PostgreSQL

```bash
# Switch to the postgres user
sudo -u postgres psql

-- Inside psql:
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

This builds everything and creates a `dist-deploy/` folder with:
```
dist-deploy/
├── api-server/
│   ├── dist/index.cjs      ← compiled Node.js server
│   └── public/             ← protected static website
└── email-gate/
    └── public/             ← compiled email-gate SPA
```

---

## Step 4 — Transfer Files to the Server

```bash
# Create the target directory on the server
ssh user@your-server "sudo mkdir -p /opt/email-gate && sudo chown $USER /opt/email-gate"

# Upload the built files (run from your local machine)
rsync -avz dist-deploy/ user@your-server:/opt/email-gate/
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
EOF

# Restrict access to the file
sudo chmod 640 /etc/email-gate/env
sudo chown root:www-data /etc/email-gate/env
```

---

## Step 6 — Install and Start the API Server (systemd)

```bash
# Copy the service file
sudo cp /opt/email-gate/deploy/email-gate-api.service /etc/systemd/system/
# (or copy from your repo's deploy/ folder)

# Give www-data ownership of the app files
sudo chown -R www-data:www-data /opt/email-gate/api-server

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable email-gate-api
sudo systemctl start email-gate-api

# Check it's running
sudo systemctl status email-gate-api

# Tail the logs
sudo journalctl -u email-gate-api -f
```

Confirm the server is listening on port 3000:

```bash
curl http://localhost:3000/api/healthz
# Expected: {"status":"ok"}
```

---

## Step 7 — Configure NGINX

```bash
# Give NGINX read access to the email-gate static files
sudo chown -R www-data:www-data /opt/email-gate/email-gate/public

# Copy the NGINX site config
sudo cp /opt/email-gate/deploy/nginx.conf /etc/nginx/sites-available/email-gate

# Edit the config and replace "your-domain.com" with your actual domain (or IP)
sudo nano /etc/nginx/sites-available/email-gate

# Enable the site (disable the default if needed)
sudo ln -s /etc/nginx/sites-available/email-gate /etc/nginx/sites-enabled/email-gate
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config and reload
sudo nginx -t
sudo systemctl reload nginx
```

Your site should now be accessible at `http://your-domain.com`.

---

## Step 8 — Enable HTTPS with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install a certificate (replaces the listen 80 block automatically)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot sets up automatic renewal; verify it works
sudo certbot renew --dry-run
```

---

## Deploying Updates

When you update the source code and need to redeploy:

```bash
# 1. On your local machine — rebuild
bash deploy/build.sh

# 2. Transfer the new build
rsync -avz dist-deploy/ user@your-server:/opt/email-gate/

# 3. On the server — restart the API server
sudo systemctl restart email-gate-api

# NGINX does not need to restart for static file changes —
# the new email-gate files are served immediately.
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
| 404 on `/site/` | Check `sudo systemctl status email-gate-api` and confirm port 3000 is up |
| Gate not showing | Check NGINX root path — must point to `/opt/email-gate/email-gate/public` |
| DB connection error | Verify `DATABASE_URL` in `/etc/email-gate/env` and PostgreSQL is running |
| Auth email fails | Check API server logs: `sudo journalctl -u email-gate-api -n 100` |
| SSL not working | Run `sudo certbot --nginx` and ensure port 443 is open in your firewall |

### Firewall (UFW)

```bash
sudo ufw allow 'Nginx Full'   # opens ports 80 and 443
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```
