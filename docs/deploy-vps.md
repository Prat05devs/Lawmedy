# Hostinger website + DigitalOcean API

This is the deployment matching the infrastructure plan: the Next.js website runs on Hostinger,
the Expo apps call the Nest API over HTTPS, and the API, PostgreSQL and Caddy run on the VPS.
Only Caddy publishes ports (80/443). PostgreSQL and the API have no public port mapping.
The database uses a dedicated `lawmedy` login, separate from the cluster administrator.
This deploys Lawmedy only; the other projects in the plan are not created here.

## API on the VPS

1. Install Docker Engine with the Compose plugin on the VPS. Point the API domain's DNS at it.
   Allow SSH, HTTP and HTTPS through your firewall; keep database and API ports closed.
2. Copy the repository and run these commands from its root:

   ```sh
   cp deploy/vps/.env.example deploy/vps/.env
   chmod 600 deploy/vps/.env
   ```

3. Fill in the domain, certificate email, website origin, database passwords, JWT/file-signing
   secrets, Gemini settings and advocate/admin accounts. Generate separate passwords and secrets
   with `openssl rand -hex 32`. Hex database passwords work directly in the supplied connection URLs.
   Existing installations must preserve their existing JWT/file-signing secrets unless intentionally
   rotating them. Set `LENDING_CERTIFICATE_PRICE_PAISE=19900` for the ₹199 certificate.
4. Start the stack. Migrations run before the API starts:

   ```sh
   docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml up -d --build --wait
   docker compose --env-file deploy/vps/.env -f deploy/vps/compose.yaml exec api node prisma/seed.mjs
   ```

   The explicit `--env-file` selects `deploy/vps/.env` even when a root development `.env` exists. The database initialization script
   runs only for a new volume. Changing a password in `.env` does not rotate a database role on an
   existing volume; rotate the database password explicitly and update its connection URLs together.
5. Check `https://<api-domain>/health` (process) and `/health/ready` (database). Both return
   `{"status":"ok"}`. Seed the in-house advocate before accepting paid work.

Files and PDFs persist in `lawmedy_private_files`; PostgreSQL uses `lawmedy_postgres_data`.
Back up both to private off-server storage and test a restore before launch. A database-only backup
does not include evidence or final PDFs. Use `docker compose ... down` without `-v` when stopping.

If the VPS already has a shared PostgreSQL cluster and Caddy, integrate Lawmedy's database role,
database and API route into those existing services. The supplied Compose file is for a new stack;
do not start a second Caddy on occupied ports or replace existing database volumes.

## Razorpay

Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the API environment only, then restart/redeploy
the API. Valid keys automatically bypass the old manual workflow, even if an old environment still
says `PAYMENT_MODE=manual`. New checkout orders use the API's configured prices; clients cannot set
the amount. Previously submitted manual payments stay in their verification queue.

Start with test keys. In Razorpay's dashboard enable automatic capture, add a webhook at
`https://<api-domain>/payments/razorpay/webhook`, subscribe to `payment.captured`, and choose a
separate secret matching `RAZORPAY_WEBHOOK_SECRET`. The checkout callback checks the provider's
capture status server-side. The webhook completes payments when the browser/app is closed before
that callback arrives. Configure this fallback before accepting live payments.

Test success, cancellation, failure, delayed capture, app closure, and webhook replay in test mode.
Then replace both test keys with live keys and configure the live-mode webhook. No client secret
or key changes are needed in the website or mobile build. Refunds remain an operation performed in
Razorpay's dashboard; this change does not add automatic refunds.

## Website on Hostinger

The website requires a Node.js application, including Next.js server rendering and server actions.
Uploading static HTML to a static/PHP-only web root will not run authentication or uploads.

### GitHub deployment (recommended for future updates)

Import `Prat05devs/Lawmedy`, branch `main`, with **root directory `apps/web`**.
Choose Next.js, Node 24, install command `npm ci`, build command `npm run build`,
output `.next`, and start command `npm run start` if requested. Use the app-local
`package-lock.json`; do not build the whole monorepo or deploy the API/mobile app here.
The app-local npm override preserves the patched Sharp version when pnpm's root
configuration is unavailable. The production start script listens on `0.0.0.0` and
uses the hosting provider's `PORT`.

Set these in Hostinger before building; keep the provider-assigned `PORT`:

```env
API_URL=https://api.lawmedy.in
NEXT_PUBLIC_API_URL=https://api.lawmedy.in
NEXT_PUBLIC_SITE_URL=https://lawmedy.in
APP_ORIGIN=https://lawmedy.in
NODE_ENV=production
```

Also set the intended public contact/brand values from `apps/web/.env.example`.
Do not put Gemini, Razorpay, database, signing or encryption secrets in Hostinger's
frontend configuration. Preserve GoDaddy nameservers and the `api` DNS record when
connecting the website's apex/www records.

### Prebuilt ZIP deployment (alternative)

1. Set the public brand/contact values from `apps/web/.env.example` **before building**, and set
   `API_URL=https://<api-domain>` and `NEXT_PUBLIC_API_URL=https://<api-domain>`.
   The latter is used by the advocate-interest form. Public `NEXT_PUBLIC_*` values are compiled into the build.
2. Build and package:

   ```sh
   pnpm --filter @lawmedy/web build
   node scripts/package-web-hostinger.mjs
   ```

3. Upload `.local/lawmedy-web-hostinger.zip` as a Hostinger Node.js app. Choose Node 24 (22 also
   works), application type Other, build script `build`, and entry `apps/web/server.js`. It is a
   prebuilt standalone Next.js server with its production dependencies, static assets and fonts.
4. At runtime set `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, `API_URL=https://<api-domain>`, `APP_ORIGIN=https://<website-domain>`,
   and the Hostinger-assigned `PORT`. Attach the website domain and enable SSL. The origin must
   match `WEB_ORIGIN` on the API.
5. Verify signup/login, private uploads, checkout, and authenticated PDF downloads through the
   deployed website. Hostinger's proxy upload limit must accommodate 10 MB files plus form overhead.

The zip excludes `.env` files. API payment/Gemini/database secrets belong only on the API host.

## Mobile builds

The old Render URL has been removed from app defaults and EAS profiles. Configure
`EXPO_PUBLIC_API_URL=https://<api-domain>` and `EXPO_PUBLIC_WEB_URL=https://<website-domain>` in
the EAS `preview` and `production` environments. Builds fail if EAS has no HTTPS API URL.
Local development can copy `apps/mobile/.env.example`; physical phones use the computer's LAN IP.

Razorpay uses its official native SDK. Rebuild the app after this dependency change; Expo Go
does not include it. From `apps/mobile`, run `npx eas-cli@latest build --profile preview` for
internal testing, then the production profile for store builds. Test on physical Android and iOS
devices, including UPI return, background/resume and cancellation, before submitting.
Existing installed versions retain their compiled API URL; keep their old API available until updated.

## Lending certificates

The ₹199 product is `LENDING_CERTIFICATE`, with its own configuration key, intake and grounded
AI draft/QA runs. Users describe a transfer already made, confirm the lender/borrower details,
attach supporting records and pay. Our in-house advocate reviews it and uploads the final PDF on
their letterhead with their stamp and signature. The upload also records approval, completes the
matter, audits delivery, and exposes a private, expiring download in both clients. Generic approval
and automatic PDF generation cannot bypass this step. No signature or stamp is fabricated.

The 24-hour delivery promise is shown after verified payment and complete information; fulfilment
requires the advocate to process their queue. This is a lending record, not an affidavit or notarisation.

## Verification and updates

```sh
pnpm typecheck
pnpm --filter @lawmedy/mobile lint
pnpm test
pnpm build
pnpm --filter @lawmedy/mobile exec expo export --platform all --output-dir ../../.local/mobile-export
node scripts/verify-integration.mjs
node scripts/verify-integration.mjs --security
node scripts/security-static.mjs
docker compose --env-file deploy/vps/.env.example -f deploy/vps/compose.yaml config --quiet
```

The integration script creates and removes an isolated temporary PostgreSQL cluster; it never uses
your existing database or external payment/AI services. API logs go to `.local/verification-api.log`.
Rebuild/redeploy the API after pulling changes; migrations apply at startup. Rebuild the website zip
after frontend or public-environment changes. Rebuild mobile apps after API-URL or native-library changes.

The session-revocation migration requires existing users to sign in again. Logout now revokes all
sessions, and disabling an account or resetting a staff password invalidates its old tokens immediately.
Set `APP_ORIGIN` explicitly on the website: its origin check rejects state-changing requests with an
untrusted Origin, including requests with forged forwarded-host headers.

Read [security-review.md](security-review.md) for test coverage and remaining launch checks, and
[operations.md](operations.md) for the 100-visitor launch baseline, resource budgets, backups and scaling gates.
