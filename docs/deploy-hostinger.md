# Deploying the API to Hostinger Cloud Hosting

The API (`apps/api`, NestJS) runs as a Hostinger **Node.js Web App**. These need a Business or Cloud
plan (Startup, Professional, Enterprise or Enterprise Plus). No Docker or system packages are needed:
final PDFs are drawn with pdfkit and the bundled fonts in `apps/api/assets/fonts`.

The website (`apps/web`) and the mobile app are not part of this deployment. They keep talking to the
API over HTTPS.

## 1. Before you start

- **Database:** use Supabase Postgres. Hostinger's built-in databases are MySQL, and the API needs PostgreSQL.
- **Files:** set `STORAGE_DRIVER=supabase`. Evidence uploads and final PDFs must not live on the
  Hostinger app disk, because a redeploy can replace it.
- **Domain:** pick the API's address, for example `api.lawmedy.in`.

## 2. Run database migrations (from your computer)

Hostinger only builds and starts the app. Apply migrations yourself before each deploy that adds one.
Put the production `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env`, then run:

```bash
pnpm db:migrate
```

## 3. Build the upload package

This repo is a pnpm monorepo, and Hostinger expects a single npm project. Package the API on its own:

```bash
pnpm install
node scripts/package-api-hostinger.mjs
```

This creates `.local/lawmedy-api-hostinger.zip`. It contains the API source, Prisma schema and fonts,
plus a `package-lock.json` pinned to the versions this repo is tested with. It never includes `.env`,
uploaded files or `node_modules`.

## 4. Create the app in hPanel

1. **Websites → Add Website → Node.js Web App → Upload your website files**, and upload the zip.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Framework / application type | NestJS (choose **Other** if it is not detected) |
   | Node.js version | 24 (22 also works) |
   | Install | `npm ci` (Hostinger's default install is fine) |
   | Build script | `build` |
   | Output directory | `dist` |
   | Entry file | `dist/main.js` |

3. Add the environment variables below, then deploy.

## 5. Environment variables

Copy the values you use on Render today. `apps/api/.env.example` explains each one.

| Variable | Value |
|---|---|
| `HOST` | `0.0.0.0` |
| `PORT` | Leave unset if Hostinger sets it. Otherwise `4000`. |
| `TRUST_PROXY_HOPS` | `1` (`2` if you switch on Hostinger CDN for the API domain) |
| `DATABASE_URL`, `DIRECT_URL` | Supabase connection strings |
| `JWT_SECRET`, `FILE_SIGNING_SECRET` | The same secrets as the current deployment. New values sign everyone out and break old download links. |
| `WEB_ORIGIN` | `https://www.lawmedy.in,https://lawmedy.vercel.app` |
| `STORAGE_DRIVER`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` | `supabase` plus your keys |
| `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | AI settings |
| `GROQ_API_KEY`, `GROQ_MODEL` (optional) | Fallback AI provider |
| `LEGAL_NOTICE_PRICE_PAISE`, `RTI_PRICE_PAISE` | Prices |
| `PAYMENT_MODE`, `PAYMENT_LINK_URL`, `RAZORPAY_*` | Payments |
| `RESEND_API_KEY`, `RESEND_FROM` | Email |
| `GOOGLE_CLIENT_IDS` | Google sign-in |
| `EVIDENCE_MAX_BYTES` | `10485760` |

## 6. Point everything at the new API

1. Attach the domain (for example `api.lawmedy.in`) to the Node.js app in hPanel and turn on SSL.
2. Check `https://api.lawmedy.in/health`. It should return `{"status":"ok"}`.
3. Website (Vercel): set `API_URL` and `NEXT_PUBLIC_API_URL` to the new address, then redeploy.
4. Mobile app: set `EXPO_PUBLIC_API_URL` and ship a new build. Older installed builds keep calling the
   old address, so keep the old API running until most users have updated.
5. If `PAYMENT_MODE=razorpay`: change the Razorpay webhook to `https://api.lawmedy.in/payments/razorpay/webhook`.

## Updating

Run step 2 if the update adds migrations, rebuild the zip (step 3), and upload it again in hPanel.

## Troubleshooting

- **Build fails with `nest: not found` or `prisma: not found`:** the build is skipping devDependencies.
  Make sure Hostinger runs a full `npm ci`, not `npm ci --omit=dev`.
- **502 or the app never comes up:** check that `HOST=0.0.0.0` is set and that the entry file is `dist/main.js`.
  The runtime log in hPanel shows startup errors, for example a missing `JWT_SECRET`.
- **Uploads over a few MB fail:** Hostinger's proxy may have a smaller request limit than `EVIDENCE_MAX_BYTES`.
  Lower `EVIDENCE_MAX_BYTES` or ask Hostinger support for the limit.
- **Matters stuck in "AI processing":** the API retries stuck jobs on a timer, which needs the process to keep
  running. If Hostinger idles the app, the retry runs when it next starts. An admin can also trigger it with
  `POST /admin/recover` (signed in as an admin).
