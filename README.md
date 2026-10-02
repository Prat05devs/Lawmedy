# Lawmedy

A private workspace for legal matters. The current build covers legal-notice intake, private evidence, fact reconciliation, recipient confirmation, Razorpay test-mode payment, grounded document generation, automated QA, recorded human advocate review, and private final-PDF delivery. RTI-specific screens remain deferred.

## Requirements

- Node.js 22 or 24 LTS
- pnpm 10.30.3 (`corepack enable`, or use `corepack pnpm` in place of `pnpm`)
- Docker Desktop with Compose running, or an existing PostgreSQL server

## Local setup (PowerShell)

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Choose a local database password and put the same value in the root `POSTGRES_PASSWORD` and the API `DATABASE_URL` (URL-encode special characters in the URL). Set the API's `JWT_SECRET` to a random value of at least 32 characters; placeholder secrets are rejected. You can generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Add a Google AI Studio key to `apps/api/.env` as `GEMINI_API_KEY`. The key stays server-side. `AI_PROVIDER=gemini` and `GEMINI_MODEL=gemini-3.8-flash` are configuration values and can be changed without modifying application code. The application still starts and accepts private uploads when the key is empty: AI analysis shows a retryable failure instead of crashing.

Evidence files default to `apps/api/.local/private-files` (or the API process's equivalent working directory) and are ignored by Git. Set `PRIVATE_STORAGE_DIR` to an absolute path in production. `EVIDENCE_MAX_BYTES` defaults to 10 MB. `FILE_SIGNING_SECRET` should be a separate random value of at least 32 characters; local development falls back to `JWT_SECRET` when it is omitted.

The legal-notice price is configured in paise using `LEGAL_NOTICE_PRICE_PAISE` (default `29900`, meaning ₹299). For Razorpay test mode, add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a separate `RAZORPAY_WEBHOOK_SECRET` to `apps/api/.env`. Configure Razorpay’s `payment.captured` webhook to call `https://your-api.example/payments/razorpay/webhook`. Missing Razorpay values leave review available and show a payment-setup message instead of crashing.

Then:

```powershell
pnpm install
docker compose up -d --wait
pnpm db:generate
pnpm db:migrate
pnpm --filter @lawmedy/api db:seed
pnpm dev
```

The seed command creates the local advocate from `ADVOCATE_EMAIL`, `ADVOCATE_FULL_NAME`, and `ADVOCATE_PASSWORD` in `apps/api/.env`. Copy the placeholders from `apps/api/.env.example`, replace the password for your own environment, run the seed command, then sign in at `/login`. Advocate accounts are sent to the role-protected `/advocate` workspace.

Final PDF generation uses a locally installed Chrome, Chromium, or Edge executable in headless mode. Windows automatically detects the standard Chrome and Edge locations. On another system, set `CHROMIUM_EXECUTABLE_PATH` in `apps/api/.env` to the browser executable's absolute path.

Email delivery uses Resend. For sandbox testing, put `RESEND_API_KEY` and a verified `RESEND_FROM` sender in `apps/api/.env`. When these values are absent, advocate approval still creates the private PDF and completes the matter; the user sees the download in Lawmedy with a clear local email-configuration note.

Open [localhost:3000](http://localhost:3000). The Nest API runs at `http://127.0.0.1:4000`. If pnpm is not on PATH, all commands work as `corepack pnpm …`. If Docker is unavailable, provision PostgreSQL and set `DATABASE_URL` before running migrations. Do not use `docker compose down -v` unless you intend to delete the database; normal `docker compose down` preserves it.

If Turborepo reports that it cannot find the package manager, run `corepack enable --install-directory node_modules/.bin` after installation. This creates project-local pnpm shims without changing the system installation.

### Optional local PostgreSQL without Docker

For a fresh checkout without Docker, run `node scripts/local-db.mjs` after `pnpm install`, **before copying an API .env**. This development-only helper runs real PostgreSQL 17 on loopback port 5433 and creates `apps/api/.env` with random local credentials and a JWT secret. It never overwrites an existing `.env`. Keep that terminal running, then run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm dev` in a second terminal. Ctrl+C stops PostgreSQL and preserves data in the ignored `.local/` directory. Restart using the same command. The bundled helper is a beta npm wrapper around PostgreSQL; Docker Compose remains the standard setup. Do not sync or commit `.local/` or use this helper for production.

## VerifY

1. Create an account at `/signup` and check that the dashboard opens.
2. Click **New Legal Notice**, then **Create matter & continue**. Creation is a POST from a confirmation form, never an accidental GET during link prefetching.
3. Describe a situation such as “I lent someone ₹50,000 in March and they haven't paid me back,” then click **Save & analyse statement**.
4. Check the neutral AI summary, grounded facts, and 2–5 follow-up questions. Expanding a fact shows the exact supporting quote from the statement.
5. Answer every question, save, refresh, and confirm that the answers remain.
6. Edit the statement and save again. A new analysis should appear; the earlier intake remains in database history.
7. Temporarily use an invalid API key and confirm the page offers **Retry analysis** without losing the statement.
8. Use another account: it should neither list nor open the first account's matter or intake.
9. Upload a PDF, JPG, PNG, or WebP under 10 MB. It should first show **Processing**, then **Processed** with a factual extraction when Gemini is configured.
10. Open **View** and confirm the private file loads. Wait more than five minutes or sign out and confirm the old link cannot be used.
11. With `GEMINI_API_KEY` empty, upload another file. The upload remains safely stored and listed, while extraction shows a handled **Failed** state with a retry button.
12. Click **Prepare facts for review**. Values that agree should carry forward automatically; differing values should appear as a choice.
13. Resolve every mismatch, enter the recipient details, check the accuracy confirmation, and continue. The matter should become **Ready for payment**.
14. With Razorpay test credentials configured, click **Pay securely with Razorpay** and complete a test payment. Confirm the database and matter page move to **Paid** only after a valid `payment.captured` webhook.
15. After a paid matter produces a QA-approved draft, confirm it is assigned to an advocate and moves to **Under advocate review**. With no Gemini key, generation remains in its handled configuration state and does not crash either app.
16. Sign in as the seeded advocate. Confirm `/advocate` groups assigned work into pending, waiting for user, and completed queues.
17. Open an assignment and confirm the original statement, confirmed facts, private evidence links, QA result, and current draft are visible. Saving an edit should create a new advocate-authored version.
18. Request more information and confirm the user sees an in-app request. The user's answer should return the assignment to advocate review with a new-information marker.
19. Check the explicit approval confirmation, approve the final draft, and confirm the matter and assignment are completed with the reviewing advocate and timestamp recorded.
20. Confirm approval creates an A4 PDF from the approved version, moves the matter to **Completed**, and shows **Your Legal Notice is Ready** with a **Download PDF** button.
21. Download the PDF while signed in and confirm the fixed layout contains the reference, date, sender and recipient blocks, numbered approved paragraphs, demand, response period, and reviewing advocate. Opening the signed URL after expiry or as another user must fail.
22. With Resend sandbox values configured, approve a fresh matter and confirm the user receives a dashboard link. Without those values, confirm PDF completion and download still work without an application error.

```powershell
pnpm typecheck
pnpm test
pnpm build
# With API and database running: exercises real auth, persistence, and ownership.
node scripts/smoke.mjs
# With API + database running, exercises the successful answer path using a
# deterministic database fixture (no external AI call):
node --env-file=apps/api/.env scripts/phase2-success-smoke.mjs
# With API + database running, validates upload, private download, missing-key
# handling, retry, and cross-user isolation:
node scripts/phase3-smoke.mjs
# Start the API with the same temporary webhook secret, then run the deterministic
# reconciliation and webhook smoke test (no Gemini or Razorpay API call):
$env:RAZORPAY_WEBHOOK_SECRET='phase4-local-webhook-secret-at-least-32-characters'
node scripts/phase4-smoke.mjs
```

On Windows, stop the API before `pnpm build` or `pnpm db:generate`: its running process locks Prisma's engine DLL. Ordinary `pnpm typecheck` does not regenerate that DLL and can run while developing.

The smoke test creates two uniquely named test users and matters in the configured database and leaves those records for inspection. Only run it against a development/test database. It does not print passwords or tokens.

## Structure and design decisions

- `apps/web`: Next.js App Router, TypeScript, Tailwind CSS. Server actions forward requests to Nest; the browser never receives the JWT in JavaScript. The JWT lives in a one-day HTTP-only, SameSite cookie (Secure in production). Protected server layouts validate it through `/users/me`, and every API operation independently validates it. Logout clears the browser session; previously copied bearer tokens remain valid until their one-day expiry.
- `apps/api`: NestJS owns all business logic. Validation rejects unknown fields; auth endpoints are throttled; passwords use bcrypt with cost 12 and a 72-byte limit. Deploy behind HTTPS; throttling is in-memory for this single-instance foundation.
- `apps/api/prisma`: PostgreSQL schema and committed migrations. References use a database sequence, e.g. `MAT-2026-000001`, avoiding concurrent count-based collisions. The sequence is global, does not reset annually, and may have gaps after rollbacks.
- Statements are append-only snapshots; `currentStatementId` identifies the active version. Each analysis points to the exact statement and AI run that produced it, so an older response cannot replace a newer intake.
- Every Gemini attempt is recorded in `ai_runs` with provider, configured model, prompt version, statement reference, raw output when available, token usage, latency, status, and a sanitized error code. Runs are claimed under a PostgreSQL row lock and have a 90-second lease for crash recovery.
- Gemini receives the statement only after save. Structured-output validation rejects malformed results, unknown fields, duplicate questions, and any extracted fact whose value and source quote cannot be found verbatim in the statement. The UI labels the result as AI-generated and asks the user to correct the source statement when needed.
- All matter and intake reads/writes filter by owner. Signup, login, matter creation, statement saves, intake requests, AI results, and answer saves create `audit_logs` records. No statement text, answer text, API key, or password is copied into audit logs.
- Evidence storage is behind a `PrivateStorage` abstraction. Local files use opaque server-generated keys outside static hosting. The API validates the declared MIME type, file signature, and size before storage, records a SHA-256 checksum, and never exposes the storage key.
- Evidence list results contain five-minute HMAC-signed view paths. Opening a file also requires the user's HTTP-only session and an ownership check. The Next.js route streams the authenticated API response without exposing the bearer token.
- Each extraction attempt is an `EVIDENCE_EXTRACTION` row in `ai_runs`; parsed results and confidence are stored in `EvidenceExtraction`. The prompt forbids guessing and requires visible source text for each extracted value. Upload, success, and failure transitions are recorded in `audit_logs`.
- Fact preparation reads only the current statement analysis and its answers plus successful evidence extractions. Comparable fields such as amounts, dates, and recipient details are grouped. Equivalent formatting is normalized for comparison; real disagreements remain separate until the user chooses one. Confirmed values are stored as `CaseFact` rows with their source references.
- Recipient details are stored separately and confirmation moves the matter to `READY_FOR_PAYMENT`. Statement, answer, and evidence mutations are then locked so the confirmed record cannot silently change.
- Razorpay Orders are created only by Nest using the configured amount. Checkout receives the public key id and trusted database order id; it never receives the key secret. Browser callbacks do not mark a matter paid. The raw webhook body is authenticated with HMAC, and amount, currency, order id, and captured status must match the stored order before the transaction sets both `Payment` and `Matter` to `PAID`.
- Document generation uses only confirmed case facts and recipient data. Every generation and QA attempt is retained as an `AiRun`; generated paragraphs keep their supporting `CaseFact` ids, and a failed QA pass never enters advocate review.
- A QA-approved draft is assigned to an advocate in the database and moves to `UNDER_ADVOCATE_REVIEW`. Advocate edits create immutable `DocumentVersion` rows with `ADVOCATE` provenance. Information requests, user responses, approvals, notifications, assignment transitions, and advocate access are audited.
- `/advocate/*` is protected in both Next.js and Nest by the authenticated user's database role. Approval requires an explicit confirmation and records `reviewedById` plus `reviewedAt` on the legal document.
- Advocate approval renders the approved structured version into escaped, deterministic HTML and converts it to an A4 PDF through headless Chromium. The PDF, its SHA-256 checksum, approved version reference, generation time, and delivery result are stored in `FinalDocument`; the private storage key is never exposed.
- Final downloads require both the user's HTTP-only session and a five-minute HMAC-signed link. Email contains only a link back to the authenticated dashboard, never a public file URL or attachment.
- RTI exists only as the requested enum value accepted by the generic API. No RTI-specific flow is implemented.

`API_URL` is server-only. No secrets use a `NEXT_PUBLIC_` prefix. Only `.env.example` files are committed. The local servers bind to loopback by default. Production requires deployment configuration, a shared rate-limit/session revocation strategy if needed, database backups, and HTTPS.

Useful routes include `POST /advocate/matters/:id/approve`, `GET /matters/:id/final-document`, `POST /matters/:id/final-document/retry`, and `GET /matters/:id/final-document/file`.

For schema changes use `pnpm --filter @lawmedy/api db:migrate:dev --name descriptive_name`. Apply committed migrations using `pnpm db:migrate`.

Framework references: [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation), [NestJS authentication](https://docs.nestjs.com/security/authentication), [Prisma 6 migration history](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/migration-histories), and [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
