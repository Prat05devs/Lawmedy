# Server: one droplet, many APIs

Every API on the DigitalOcean droplet (Batra Connect, Lawmedy, NewsVO, Labour Youth, Valley Ride, and any later one) is set up and deployed with one script, [`server.sh`](server.sh), so they all follow the same layout. The frontends and dashboards stay on Hostinger and call these APIs over HTTPS.

```
   Browsers and mobile apps ──► Hostinger (React / Next.js frontends)
              │                          │
              └──────── HTTPS ───────────┘
                          ▼  :80 / :443 (the only open ports)
   ┌─────────────────────────────────────────────────────────────┐
   │ /opt/platform   shared services                             │
   │   caddy     HTTPS for every domain, one file per site       │
   │   postgres  one instance, one database + role per app       │
   │   backup    nightly dump of every database                  │
   └───────┬──────────────────────────────────────┬──────────────┘
     "edge" network (proxy ↔ apps)      "data" network (apps ↔ PostgreSQL;
           │                              internal, no internet access)
   ┌───────▼──────────┐ ┌──────────────────┐ ┌──────────────────┐
   │ batra-api:4000   │ │ lawmedy-api:…    │ │ newsvo-api:…     │  /opt/apps/<app>
   │ (own Compose     │ │                  │ │                  │  one Compose project
   │  project)        │ │                  │ │                  │  each, own .env
   └──────────────────┘ └──────────────────┘ └──────────────────┘
```

- **One proxy owns ports 80 and 443.** Each domain is one small file in `/opt/platform/conf/sites/`. Adding or removing one reloads the proxy without dropping connections. A bad file is rejected and the old configuration stays live.
- **One PostgreSQL, isolated databases.** Each app gets its own database and login role (`server add-db`). A role can connect only to its own database; it can't reach another app's database or the admin database. PostgreSQL is never published, and its network has no internet access.
- **Each app is its own Compose project** in `/opt/apps/<app>`, with a unique name on the shared networks (e.g. `batra-api`). Secrets stay in each app's `.env` (mode 600, never in git).
- **Backups:** every database is dumped nightly and before every deploy to `/opt/backups/postgres/<database>/`, and kept 14 days.

**Size:** the $18 plan (2 vCPU, 2 GB RAM, 60 GB SSD) fits five APIs, PostgreSQL and Caddy with the 2 GB of swap that setup adds. Images are built on the server, so check `server status` after the first few deploys. If memory stays near full, resize to 4 GB in the DigitalOcean dashboard (a few minutes' downtime, nothing to reinstall).

## 1. Create the droplet (once, in the DigitalOcean dashboard)

1. Ubuntu 26.04 LTS (24.04 also works), region Bangalore (BLR1), with your SSH key.
2. **Networking → Firewalls:** allow inbound TCP 22, 80 and 443, and UDP 443, for the droplet. This matters: ports published by Docker bypass the droplet's own `ufw` firewall, but not DigitalOcean's.
3. Turn on weekly droplet backups.

## 2. Set up the server (once; safe to re-run)

From this repository on your computer:

```sh
scp infra/server.sh root@<droplet-ip>:
ssh root@<droplet-ip> 'bash server.sh setup --email you@example.com'
```

This:
- installs updates and turns on automatic security updates;
- adds `fail2ban` against SSH password guessing, and 2 GB of swap;
- installs Docker from Docker's own repository, with log rotation;
- creates the `deploy` user with your SSH key, then turns off root login and password login (only once that key is in place, so you can't be locked out);
- starts the proxy, PostgreSQL and backups (the PostgreSQL admin password is generated into `/opt/platform/.env`);
- installs the script as the `server` command.

From now on, log in as `ssh deploy@<droplet-ip>`.

## 3. Add an app

1. **Database:** `server add-db lawmedy` prints a password and a `DATABASE_URL` (host `postgres`). Put them in the app's `.env` straight away; they aren't shown again.
2. **Compose:** the app joins the shared networks and publishes no ports:
   ```yaml
   services:
     api:
       networks:
         default: {}
         data: {}                   # reaches PostgreSQL at postgres:5432
         edge:
           aliases: [lawmedy-api]   # unique across the whole server
   networks:
     edge: { external: true }
     data: { external: true }
   ```
   Don't run a separate database container in production, and don't name any service `postgres` or `caddy`.
3. **Domain:** point its DNS `A` record at the droplet. Then run `server add-site api.lawmedy.com lawmedy-api:8000` (the certificate is issued on the first visit). A repository can instead ship its own site block, as Batra Connect does: `server add-site api.batraconnect.com deploy/api.caddy`. Plain static sites work too: `server add-site example.com static`, then copy the files into `/opt/sites/example.com`.
4. **CORS:** allow the Hostinger frontend's `https://` address in the API.
5. `server deploy /opt/apps/lawmedy`.

Other commands:
- `server remove-site <domain>` takes a domain off the proxy.
- `server backup` dumps every database now.
- `server status` lists containers, sites, databases with their sizes, disk and memory.

## 4. Deploy

```sh
server deploy /opt/apps/<app>[/subfolder]
```

This:
1. pulls the latest code (fast-forward only);
2. backs up every database, plus the app's own `backup` service if it has one;
3. rebuilds;
4. waits until every container is healthy, so a failed start is reported instead of passing silently.

Put `COMPOSE_FILE=compose.yaml:compose.production.yaml` in an app's `.env` when it needs several Compose files.

**Rollback:** run `git -C /opt/apps/<app> checkout <previous commit>`, then `docker compose up -d --build --wait` in the app folder. Run `git checkout main` before the next `server deploy`. To restore a database: `pg_restore --clean` the dump from `/opt/backups/postgres/<database>/` into it.

**Off-server copies:** a backup on the same disk isn't a backup. Copy `/opt/backups` off the droplet daily, e.g. with `rclone` to a DigitalOcean Spaces bucket from cron: `30 3 * * * rclone copy /opt/backups spaces:server-backups`.

## Batra Connect API (`api.batraconnect.com`)

As `deploy`, after step 2:

```sh
# The repository is public, so no key is needed. (If you make it private, add a read-only deploy key first.)
git clone https://github.com/Prat05devs/batraconnect.git /opt/apps/batraconnect
cd /opt/apps/batraconnect/backend
server add-db batra                      # note the password it prints
cat > .env <<EOF
COMPOSE_PROJECT_NAME=batra
COMPOSE_FILE=compose.yaml:compose.production.yaml
DB_PASSWORD=<the password from add-db>
CONFIG_MASTER_KEY=$(openssl rand -base64 48)
CORS_ORIGINS=https://batraconnect.com
BACKUP_DIR=./backups
BACKUP_KEEP_DAYS=14
EOF
chmod 600 .env          # and copy DB_PASSWORD and CONFIG_MASTER_KEY into your password manager
server add-site api.batraconnect.com deploy/api.caddy
server deploy .
docker compose exec -e STAFF_NAME="…" -e STAFF_EMAIL="…" -e STAFF_PASSWORD="…" -e STAFF_ROLE=admin \
  api node scripts/create-staff.js
curl https://api.batraconnect.com/health/ready
```

After that, every release is `server deploy /opt/apps/batraconnect/backend`. Its own `backup` service also archives uploaded photos to `backend/backups`, so include that folder in the off-server copy. Monitoring and first-day setup are in [`backend/docs/operations.md`](../backend/docs/operations.md).
