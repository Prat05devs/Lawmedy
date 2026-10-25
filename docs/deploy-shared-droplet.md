# Lawmedy on the shared DigitalOcean droplet

The API uses the existing Caddy and PostgreSQL platform on `139.59.72.220`.
The website remains a separate Hostinger deployment. Do not run `server setup`,
start another database/proxy, publish API/database ports, or change the root DNS.

## Layout and release

- `/opt/apps/lawmedy/releases/<UTC release>/`: verified API source and source manifest.
- `/opt/apps/lawmedy/current`: current release symlink.
- `/opt/apps/lawmedy/shared/api.env`: private configuration, mode 0600, linked into Compose.
- `/opt/apps/lawmedy/shared/deployment.log`: deployment log, mode 0600.
- `/opt/apps/lawmedy/backups`: daily private-file archives, mode 0700.
- Compose project `lawmedy`; external networks `edge` and `data`; database/role `lawmedy`.
- Caddy site `api.lawmedy.in` → `lawmedy-api:4000`.

The first release is a source bundle from the tested working tree because it contains
uncommitted changes absent from GitHub. Its SHA-256 and per-file manifest are retained
on the server and locally. Future releases should be committed and reviewed, or use the
same verified bundle procedure. Never deploy the older GitHub HEAD over this release.

Build context is the release root; Compose is `deploy/shared/compose.yaml`.
`server deploy /opt/apps/lawmedy/current/deploy/shared` first backs up the shared
databases, then builds and starts only this Compose project. Prisma applies pending
migrations before API startup. The final runtime uses Debian 13, applies available OS updates and excludes npm, Corepack and Yarn. It is non-root, read-only except private storage
and temporary files, capability-free, with memory/CPU/PID limits and readiness checks.

Seed the initial advocate/admin only on a new database:

```sh
cd /opt/apps/lawmedy/current/deploy/shared
docker compose exec -T api node prisma/seed.mjs
```

Seeding again resets the configured staff passwords and workflow defaults; do not use
it as a routine startup command. After seeding, remove staff passwords from `api.env`.
Provider credentials are imported into encrypted database rows on first startup and
subsequently managed through the admin configuration page. Environment changes do
not override an already initialized provider configuration. Preserve the encryption key.

## Public setup

GoDaddy: `api` A record → `139.59.72.220`; keep apex, www and nameservers unchanged.
Install only this site using the platform helper:

```sh
server add-site api.lawmedy.in /opt/apps/lawmedy/current/deploy/shared/api.caddy
curl --fail https://api.lawmedy.in/health/ready
```

Hostinger must use `API_URL=https://api.lawmedy.in`, `APP_ORIGIN=https://lawmedy.in`
and the intended public API URL for checkout. Confirm the values against
`apps/web/.env.example` before building/uploading the website. Redeploy the patched
Next.js website separately; the droplet deployment does not update Hostinger.

Razorpay live webhook: `https://api.lawmedy.in/payments/razorpay/webhook`, event
`payment.captured`. Configure its secret to match the active live configuration in the
admin portal. Test and live webhooks/keys are separate. The agent does not create real
payments. Verify capture, delayed webhook, duplicate delivery and checkout closure
with the account owner before accepting customer payments.

## Backups and restore

The shared nightly database backup automatically includes the new `lawmedy` database.
The Lawmedy backup service archives its private volume daily and retains 14 days.
Run both before changes:

```sh
server backup
cd /opt/apps/lawmedy/current/deploy/shared
docker compose exec -T backup sh /backup.sh
```

Database dumps are under `/opt/backups/postgres/lawmedy/`; files are under
`/opt/apps/lawmedy/backups/`. Copy both off the droplet securely, together with a
separate encrypted backup of `shared/api.env`, especially `CONFIG_ENCRYPTION_KEY`.
A database dump alone cannot recover encrypted credentials or uploaded documents.
Droplet-local copies do not protect against server loss. Enable DigitalOcean backups
and an off-server retention policy through the owner's account.

Restore rehearsals must target a temporary database and temporary file directory, never
overwrite production. Use `pg_restore --exit-on-error --no-owner --no-acl` with a
matching PostgreSQL version; check schema, row counts and decrypted configuration,
then extract the corresponding file archive and compare file hashes. Restore directory
permissions to 0700 and files to 0600, owned by UID 1000.

## Rollback

Keep the previous tagged API image and release directory. Back up before changing the
`current` symlink. Point it at the previous release and use that release's image tag with
`docker compose up -d --no-build --wait`. Do not blindly reverse migrations: first check
whether the previous code accepts the current schema. A destructive database restore
requires explicit review and a matching file/configuration backup. The shared helper
prunes dangling images, so rollback images must retain explicit tags.

Do not run `docker compose down -v`, remove shared networks, or restart the shared
platform to recover a Lawmedy-only issue. Check `docker compose logs --tail 100 api`
and readiness first; logs and environment files can contain private information.

## Initial deployment evidence

Release `20261025T155024Z` is healthy at `https://api.lawmedy.in/health/ready`.
The database/file restore rehearsal passed, including encrypted-provider decryption.
A manual off-droplet recovery snapshot exists on the Mac under the ignored,
owner-only `.local/droplet-backups/recovery-snapshot` directory. Set up scheduled
remote retention; this one manual snapshot is not an ongoing off-server backup policy.
See [security review](security-review.md) for residual upstream OS advisories and
acceptance work still pending. Do not describe the deployment as vulnerability-free.
