# Readiness check — 22 October 2026

| Priority | Finding | Change and evidence |
|---|---|---|
| P0 | Mobile had only manual payment references. | Native Razorpay checkout added; both clients use the API's mode and configured prices. Valid API keys override the old manual setting. |
| P0 | A valid checkout signature could settle an uncaptured payment. | API now fetches and checks capture, amount, currency and stored order. Tests reject authorised-only payments, mismatches, forged signatures and cross-user verification. |
| P1 | Concurrent web/mobile taps could create separate payable orders. | Matter row lock serializes order creation. Real PostgreSQL integration test confirms both requests reuse one order. |
| P1 | Lending certificate and ₹199 price were absent. | Separate matter type, migration, configurable price, intake/draft/QA, both clients and advocate delivery added. Human upload is mandatory for the final signed/stamped PDF. |
| P1 | Hosting settings still pointed mobile builds at Render. | Environment-based URLs and an EAS HTTPS check replace the old URL. VPS Compose, Caddy, private database role and persistent file storage added. |
| P1 | Website actions had the default 1 MB body limit despite offering 10 MB uploads. | Server-action limit raised to 12 MB, retaining the API's 10 MB file checks. |
| P1 | Disabled/deleted accounts and copied sessions were not consistently revoked. | Database-backed session versions and active-account checks; logout, staff password reset and account deactivation invalidate old sessions. |
| P1 | Spoofed forwarded host bypassed web action origin checking. | Reproduced a state-changing action, added exact configured-origin enforcement, and verified both malicious cases fail while same-origin actions work. |
| P1 | Supabase did not verify an existing bucket's privacy. | Public or ambiguous buckets fail closed before reads/writes. |
| P1 | Concurrent recovery could duplicate extraction; upload memory needed bounds. | Database claim, bounded provider deadline/lease, multipart admission/disconnect recovery, evidence count cap and bounded admin ZIPs. |
| P2 | API polling and operational budgets needed launch sizing. | One overview request, slower human-review polling, hidden-screen pauses, admin operations snapshots, five-connection pool, memory budgets and rotated logs. |
| P2 | Mobile lint failed and review choices could reset on refresh. | State handling corrected; selection persists while its fact ID is still current. Reviewed controls have radio/checkbox semantics and touch targets. |
| P2 | Public instructions described manual payment. | Web and mobile process/help copy updated for secure checkout. Existing manual submissions retain their verification queue. |

Verified:

- TypeScript checks pass for API, web and mobile.
- Mobile lint passes.
- 30 backend test suites / 137 tests pass.
- Nest and Next.js production builds pass.
- Expo exports Android, iOS and web bundles.
- All 18 migrations apply to a fresh isolated PostgreSQL database.
- 55 live security checks pass, including upload disconnect recovery, a five-worker extraction race and authenticated user/admin/advocate page rendering.
- Local 50/100-request overview/admin bursts return zero errors. These are not sustained VPS capacity tests.
- The isolated production API dependency audit reports no known advisories; three build/test tooling advisories remain tracked in the security review.
- Isolated HTTP/database tests pass for auth, ownership, intake answers, evidence upload, signed
  downloads, reconciliation, webhook settlement, and payment/certificate delivery.
- The certificate integration test verifies ₹199 order creation, concurrent-order reuse,
  captured-only settlement, retained generation/QA runs, replacement of model party names with
  confirmed names, rejection of generic approval, mandatory advocate PDF upload, stale-version
  rejection, duplicate-delivery rejection, audit history and private final download.
- Desktop browser check shows the current home page, ₹199 certificate card and product description.
- Compose configuration and database-init shell syntax validate.
- Hostinger standalone website package is generated without `.env` files.

Remaining launch verification:

- Add API credentials privately and run real Razorpay test-mode payments, including UPI return and
  delayed capture/webhook recovery. Provider calls were deterministic fixtures during integration tests.
- Build and test the native SDK on physical Android and iOS devices. Bundle exports verify JavaScript
  and assets; they do not verify native compilation, signing or device-specific payment behavior.
- A Linux image built initially. The final image rebuild/runtime verification was blocked by host disk exhaustion and Docker storage errors. Temporary test artifacts were removed and Docker was stopped; final Linux runtime and image-CVE checks remain pending. No production deployment was attempted.
- Apply production migrations, seed the in-house advocate, configure hosting/DNS/HTTPS and backups,
  and verify deployed URLs. This work prepares the deployment; it does not deploy it.
- Test the configured Gemini model and email delivery with the deployment's provider keys.

See [deploy-vps.md](deploy-vps.md) for the complete environment and deployment steps.
See [security-review.md](security-review.md) for findings and test scope, and [operations.md](operations.md)
for the 100-visitor baseline, measured results, scaling conditions and recovery procedures.
