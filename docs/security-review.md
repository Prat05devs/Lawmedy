# Pre-deployment security review — 25 October 2026

This review combines application code inspection, regression tests, adversarial HTTP
checks and dependency scanning. It reduces identified risks; it does not certify the
absence of vulnerabilities or replace an independent penetration test.

## Findings fixed

| Severity | Finding | Remediation |
|---|---|---|
| High | New Gemini provider-attempt records lacked matter ownership; their output could survive account deletion. | Attempts require a running parent AI job, inherit its ownership/retention fields, and cascade on parent deletion. All six document/QA paths, intake and evidence pass the parent context. The migration scrubs outputs from legacy unowned attempts whose owners cannot be recovered. Real PostgreSQL tests verify ownership, missing/deleted context rejection and deletion. |
| High | Google sign-in implicitly trusted an email match to link an existing account, permitting pre-registration account takeover. | Verify Google's subject and bind it uniquely. Email collisions require the existing sign-in method; they never issue a token or mutate the account. Tests cover collisions, exact identity binding and missing subject. Existing email-only Google users are not silently linked. |
| Critical/high dependencies | Fresh advisories affected Next.js, Zod, multipart handling and compressed request parsing. | Website upgraded to Next.js 16.4.3; API uses Zod >=4.6.6, Multer >=2.5 and body-parser >=2.4 through explicit overrides. Lockfile updated and production builds/integration checks pass. Hostinger must receive the updated website separately. |
| High, previously fixed | Disabled/deleted users and copied tokens could retain access. | Authentication checks active database state and token version; logout, staff resets, deactivation and deletion revoke sessions. |
| High, previously fixed | Forged forwarded-host headers could bypass web action origin checks. | Exact configured-origin checks reject ordinary and spoofed cross-site requests; same-origin actions work. Tested against the production Next build. |
| High, previously fixed | Existing Supabase buckets were not verified private. | Every operation verifies private bucket metadata and fails closed. The droplet uses private local storage. |
| Medium, previously fixed | Multipart/count races, duplicate extraction and malformed signed downloads. | Bounded file/field/part counts and sizes, concurrency/rate limits, transactional claims and exact signature validation. Private file access checks ownership and role. |
| Defense in depth | Shared-host deployment and credential confidentiality. | Separate database role, no published API/database ports, non-root read-only container, resource limits, private files, exact HTTPS origins and independent signing/encryption secrets. Admin provider secrets are authenticated-encrypted and masked on reads; changes are role-gated and audited. |

Apply migrations with the matching release. The AI ownership migration intentionally
removes retained output from legacy attempts without recoverable ownership. Preserve
`CONFIG_ENCRYPTION_KEY` with backups; losing it makes stored provider credentials
unreadable. Existing sessions from before the token-version migration require sign-in.

## Verification completed locally

- **158 backend tests / 36 suites passed.**
- API production compilation and Next.js **16.4.3** production build passed.
- Fresh disposable PostgreSQL migrated through every migration; all end-to-end fixture
  scenarios passed: auth/intake, evidence, reconciliation, capture and webhook replay,
  ₹199 lending certificate, mandatory advocate delivery, private downloads and audit.
- **55/55 adversarial HTTP checks passed**, including anonymous/role/ownership access,
  JWT tampering/expiry/issuer, privilege escalation, invalid DTOs, upload bounds, signed
  URL tampering/expiry, session revocation, CORS, webhook authentication, web CSRF and
  extraction overlap. User, advocate and admin pages rendered successfully.
- Admin configuration integration verified encrypted/masked secrets, live/test switching,
  pinned pending orders, archived webhook verification, Gemini priority/disable, audit
  history, restart persistence and AI-attempt deletion with the owning account.
- Bursts of 50 and 100 concurrent authenticated reads completed without errors in the
  isolated local harness. This is not a production load/capacity certification.
- Source hygiene scan reported no findings; this is pattern-based and does not prove
  Git history or every ignored local file is free of secrets.
- **Isolated packaged API dependency scan: zero known advisories, 230 dependencies.**

Evidence is in ignored `.local/security-audit-tests.log`, `.local/security-build-api.log`,
`.local/security-build-web.log`, `.local/security-integration.log`,
`.local/security-api-runtime-audit.json`, `.local/security-audit-prod-patched.json`
and `.local/security-static-current.json`. Never publish private environment files.

## Remaining dependency advisories

The full workspace production scan reports two high advisories, both in Expo CLI
mobile development/build tooling, absent from the isolated API dependency graph:

| Path | Disposition |
|---|---|
| Expo CLI → node-forge 1.4.0 | Registry reports no patched range. Keep tooling private and track [upstream advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv). |
| Expo CLI → Zod 3.25.76 | Affected legacy major; patched range starts at 4.6.6. Do not force an incompatible major into Expo CLI without upstream support. API's direct Zod is patched. Track [upstream advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |

No advisories were suppressed. These counts are time-specific; rescan on every release.
An npm/pnpm audit does not cover Debian packages, Node's bundled components, unknown
flaws or every native dependency. The completed Linux image findings and deployment evidence are recorded below.

## Deployment and operational checks

See [shared deployment procedure](deploy-shared-droplet.md) for the actual existing
Caddy/PostgreSQL infrastructure, source release manifests, backup locations and rollback.
The public-host checks below completed on 25 October 2026.

Remaining acceptance work outside deterministic tests:

- Actual Razorpay captures/recovery and live webhook registration by the account owner;
  no real charge was created during this audit.
- Actual configured Gemini model/quota/outage behavior and email delivery. Provider
  fixture success does not prove the configured upstream model or email account works.
- Physical Android/iOS checkout and private downloads; JS exports do not test native SDKs.
- A scheduled off-server backup policy and sustained production-like load tests. A manual
  off-droplet snapshot and restore rehearsal passed; ongoing remote retention still needs setup.
- Redeploy the patched website to Hostinger and confirm its API/origin settings.

Reviewed against [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
[file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
and [secrets management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).

Reproduce: `pnpm --filter @lawmedy/api test`, API/web production builds,
`node scripts/verify-integration.mjs --security`, `node scripts/security-static.mjs`,
and a registry audit of the packaged API's isolated production lockfile.

## Linux image findings and residual risk

Trivy 0.76.1 scanned the exported image without access to the Docker socket. Its pinned
scanner image digest is `sha256:790fd66d1697395d8693d1acaa1ea702406a20f109b6fc7bac8db623eca6c06c`.
The initial Debian 12 image reported 1 critical and 58 high OS findings plus 5 high
findings in npm's bundled libraries. The final runtime uses Debian 13.7, applies
available OS updates and removes npm, Corepack and Yarn from the runtime.

Final image: **0 critical, 43 high, 58 medium, 60 low and 1 unknown OS package findings;
0 Node package findings.** No remaining finding lists an available fixed version in
the scanner response. Counts are package/CVE pairs: the 43 highs represent eight
unique CVEs, not 43 independent application entry points. This is a residual risk,
not a clean vulnerability scan and not grounds to claim zero vulnerabilities.

| High CVE group | Reported component | Runtime constraints / follow-up |
|---|---|---|
| CVE-2026-76642, CVE-2026-78408, CVE-2026-78409, CVE-2026-78410 | util-linux libraries/helpers | Local mount/cgroup/namespace helper paths. API runs as UID 1000, all capabilities dropped, no-new-privileges, read-only root; no application operation invokes these privileged helpers. Track Debian fixes and rebuild. |
| CVE-2026-54369 | libacl | Local symlink/privileged ACL operations. No privileged API process or ACL-management feature; shared system files are read-only. Track the upstream fix. |
| CVE-2026-16742 | systemd source packages | systemd-homed signature-verification issue attributed to shared libraries; the API does not run a home-management service. Keep the finding visible and track Debian's assessment. |
| CVE-2025-69720 | ncurses/libtinfo | Terminal-related parsing; API does not expose a terminal or accept terminal databases. Do not accept arbitrary environment/configuration files. Track the upstream fix. |
| CVE-2026-9538 | perl-base source package | Archive::Tar handling; application archives use Node libraries and the separate backup container's tar. Do not introduce Perl archive processing of uploads. Track the upstream fix. |

These are contextual mitigations, not proof of universal non-exploitability. The audit
has not independently reproduced each upstream CVE. Raw reports are ignored local
artifacts `.local/security-linux-image-audit.json` and
`.local/security-linux-hardened-image-audit.json`. Rescan the final image on each release.

## Completed droplet verification

- Release `20261025T155024Z` deployed at `/opt/apps/lawmedy/current`, source bundle
  SHA-256 `74189a359778f757365214bee8e0731f87efdfdb2648d483fe6c0409460bb2b0`.
  Per-file source hashes were verified before building.
- `https://api.lawmedy.in/health/ready` returns HTTP 200 with a trusted TLS certificate;
  public pricing returns all three services at ₹299/₹299/₹199.
- Public checks passed: HSTS/nosniff, sensitive-path rejection, anonymous rejection,
  seeded admin login, advocate denial on admin configuration, masked secret responses,
  live payment configuration, enabled Gemini key and untrusted-origin CORS behavior.
- Google's read-only metadata endpoint returned HTTP 200 for the configured
  `gemini-3.8-flash` model. No document generation or payment was performed.
- Container checks confirmed non-root execution, a read-only root, no published ports,
  all capabilities dropped, 512 MiB memory and 128 PID limits, and UID 1000-owned 0700
  private storage. No `.env`, npm installation or one-time provider/staff credentials
  remain in the API runtime. Provider keys continue working from encrypted DB rows.
- Shared Caddy/PostgreSQL were reused. Existing Batra and Valley Ride APIs remained
  healthy. Only Lawmedy's site, database, volume and Compose project were added.
- Shared database and Lawmedy private-file backups run locally. A restore rehearsal
  created a separate temporary database, compared staff/configuration/audit/migration
  counts, decrypted restored provider credentials and checked a restored synthetic
  private file's SHA-256. Temporary fixtures/database were removed afterward.
- A manual recovery snapshot of database, files and encryption configuration was
  copied to this Mac under ignored `.local/droplet-backups/recovery-snapshot`, with
  owner-only permissions and matching checksums. This contains secrets: never commit
  or share it. Scheduled off-server backups and DigitalOcean backups are still pending.
- The patched Hostinger website ZIP was rebuilt with the production API/domain URLs
  at `.local/lawmedy-web-hostinger.zip`. It has not been uploaded to Hostinger.

Razorpay's account-side live webhook registration remains an owner setup step:
`https://api.lawmedy.in/payments/razorpay/webhook`, `payment.captured`, using the matching
secret already held privately in the local API `.env` and encrypted live configuration.
Never put its value in documentation or chat. Google OAuth and transactional email
remain unconfigured unless their client IDs/provider settings are supplied.

## GitHub / Hostinger pre-push follow-up

- Gitleaks 8.30.1 (official release archive checksum verified) reported no findings in
  the proposed source snapshot or all 46 existing commits. An exact-value scan also
  checked 22 local credential values without printing their contents. This is evidence
  of the scan coverage, not a guarantee that all conceivable secrets are detectable.
- Ignore rules additionally exclude machine credential directories, private storage,
  uploads, database dumps, key/certificate files and backup directories. No environment
  file other than placeholder `.env.example` files is included. Recovery data stays local.
- A full dependency scan including development tooling found four fast-uri advisories
  in Nest's CLI dependency chain. The compatible `ajv>fast-uri` override now requires
  >=3.1.9; the post-update scan has only the two previously documented Expo highs.
  [Upstream fast-uri advisory](https://github.com/advisories/GHSA-w74x-v6f9-j3xg).
- Isolated website scans report zero known advisories: 145 dependencies for the pnpm
  production graph, 219 including pnpm build dependencies, and 184 in the app-local
  npm graph including development/optional dependencies. Scanner counting differs.
- `apps/web/package-lock.json` and its local Sharp override make `npm ci` from Hostinger's
  `apps/web` root deterministic without installing unrelated API/mobile workspaces.
  No scanner result was suppressed and no incompatible Expo/Zod major override was used.
- API tests remain 158/158 across 36 suites. All three workspace type checks pass.

Hostinger may use a different advisory feed or scan the complete monorepo if configured
at the repository root. Deploy the website from `apps/web` and review the actual hosting
scan after deployment. The backend image's residual OS findings remain as documented
above; a clean frontend package audit does not clear those independent findings.
