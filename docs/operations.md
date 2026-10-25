# Launch operations — 22 October 2026

Prepare for approximately 100 simultaneous visitors during the release/demo, normally fewer than
50. Start with **one API process behind Caddy**, PostgreSQL on its private Docker network, and the
website on Hostinger. This is a baseline to validate on the 2-vCPU/2-GB VPS, not a capacity guarantee.
These budgets cover Lawmedy alone; five active projects sharing this machine need a combined load test.

## Request and data flow

| Flow | Delivery and request budget |
|---|---|
| Public website | Next caches public pricing/testimonials for five minutes. Public API responses have bounded cache TTLs. |
| Authenticated website | Server reads the HTTP-only cookie and calls the API. React request caching deduplicates the layout/page user lookup. Private data is never shared-cacheable. |
| Matter detail | Both clients use one `/matters/:id/overview` request for the screen's data. Authorization remains enforced by each backend service. Latest statement only is returned; historical versions stay in the database. |
| Active AI work | Poll at 3, 5, 8, 15, then 30 seconds. Pause in the background and stop after ten minutes. |
| Advocate/manual payment wait | Poll once per minute while visible. Completed and actionable states do not keep polling. Mobile deduplicates overlapping same-path fetches. |
| Admin | Aggregate dashboard queries run together; matter lists return at most 200 records. Operations metrics load on demand, with no continuous polling. |
| Files | Authenticated private downloads. One file per upload, 10 MB maximum, default ten evidence files per matter. At most two multipart uploads run simultaneously per API process; extra uploads get 503 plus Retry-After. |
| Admin ZIP | 25 MB aggregate limit, checked before reading and against actual bytes; one request/minute/admin. Larger collections use individual downloads. |

Backoff reduces traffic; it does not make polling free. A web refresh also validates the session.
Do not cache authorization results across requests to save database queries: immediate session
revocation depends on the database check. Public content is the appropriate shared cache target.

## VPS budgets and balancing

| Component | Initial setting |
|---|---|
| API | Non-root production image; production dependencies only; 768 MiB memory cap; 512 MiB V8 old-space cap; 256 process limit; 90-second stop grace period. |
| Prisma | One client per API process; five database connections, 20-second pool wait timeout. |
| PostgreSQL | 768 MiB memory cap; 128 MB shared buffers; 40 maximum connections; 4 MB work memory per operation. |
| Caddy | 128 MiB memory cap; HTTPS termination; 12 MB request-body limit; reverse proxy to the API. |
| Container logs | Three rotated 10 MB files per service. No HTTP access logging of user URLs or bodies is enabled by this template. |

Memory caps total 1,664 MiB, leaving about 384 MiB on a 2-GiB host for the OS/Docker. That is modest
headroom. V8's limit does not include Buffers or all native allocations; inspect container RSS under
real uploads and provider calls. Build images on CI/a build machine if building on the VPS causes
memory pressure. A 4-GB machine is the next straightforward step if measured headroom is insufficient.
Docker recommends measuring application memory and applying resource constraints; a limit can still
cause a container to be killed when exceeded. [Docker resource guidance](https://docs.docker.com/engine/containers/resource_constraints/)

Caddy currently has one upstream, so it terminates TLS and proxies traffic; there is no multi-instance
load balancing or high availability. A second API on the same small VPS competes for the same CPU/RAM.
First scale the machine if needed. Before running multiple API processes or hosts, provide shared
rate-limit state, private object storage accessible to every replica, coordinated background work,
and a database connection budget across all replicas. Verify recovery/claim behavior across processes
before enabling multiple workers. Caddy supports balancing/health checks when several upstreams are
actually ready. [Caddy reverse-proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

AI calls run after persisted requests where supported, with audited runs, a two-minute provider-chain
deadline and five-minute leases. Extraction claims serialize in PostgreSQL to prevent duplicate work.
Recovery checks every five minutes and caps repeated failures. **There is no durable global worker
queue or global AI-concurrency cap yet.** A 100-visitor browsing target does not imply support for 100
simultaneous multimodal AI jobs. If the launch includes mass uploads/drafting, add admission/worker
scheduling and test it as a separate change before that workload is opened to users.

## What was measured

Disposable local PostgreSQL, five-connection Prisma pool, compiled API, no external
providers, and a populated matter overview with statement/analysis/evidence:

| Endpoint | Concurrent requests | p50 | p95 | Errors |
|---|---:|---:|---:|---:|
| Matter overview | 50 | 79 ms | 103 ms | 0 |
| Admin dashboard | 50 | 31 ms | 32 ms | 0 |
| Matter overview | 100 | 154 ms | 189 ms | 0 |
| Admin dashboard | 100 | 55 ms | 59 ms | 0 |

These are short local read bursts against one user/matter and a small database. The table records
the representative final API run saved in `.local/security/launch-read-burst.json`. They exclude WAN/TLS,
Hostinger rendering, sustained traffic, fresh logins/bcrypt, real Gemini/Razorpay latency, concurrent
large uploads and the VPS memory/CPU constraints. The repeatable script is
`node scripts/verify-integration.mjs --security`; JSON results are in `.local/security/security-results.json`.

## Staging acceptance before release

1. Run the Docker image on the intended VPS and verify private ports, HTTPS, readiness and migrations.
   Repeat adversarial checks against disposable staging data with production origins configured.
2. Ramp 10 → 25 → 50 → 100 distinct sessions, with realistic 10–30-second reading/typing intervals.
   Hold each level for five minutes, then a 100-session read/demo workload for 15 minutes. Include
   public pages, login, overview, admin/advocate reads and private downloads. Separate upload and AI
   scenarios so an expensive-path failure is visible. Only use synthetic documents.
3. Initial acceptance targets: ordinary read p95 <1 second, <1% unexpected errors, no sustained CPU
   above 70%, no container restarts/OOM, VPS memory below 80%, and no pool timeouts. These are release
   targets, not measured VPS results. AI completion latency needs a separate provider-aware target.
4. Test two simultaneous 10 MB uploads and the temporary third-upload rejection; retry after the
   first completes. Exercise real test-mode provider failures, webhook replay, app closure/resume and
   the signed advocate PDF workflow. Confirm the provider account's actual quotas support the demo.

## Observe and respond

`/admin/operations` is ADMIN-only and shows per-process uptime, handled/error counts, active/peak
requests, a bounded p95 histogram and memory. Counts cover requests passing guards; they exclude
guard rejections and background job latency, and reset after restart. They are diagnostic snapshots,
not an alerting system. Never make this endpoint public.

Use `docker compose ... ps`, `docker stats --no-stream` and restricted container logs alongside VPS
monitoring. Configure external alerts for readiness failure for two minutes, 5xx >1% for five minutes,
memory >80%, disk >80%, growing failed/stuck AI runs and paid work approaching its 24-hour delivery
deadline. Alerting accounts/channels have not been configured here. A Docker healthcheck marks an
unhealthy process; it does not automatically restart a still-running unhealthy container. Investigate
database/network failures before restarting services. An admin recovery action is rate-limited and audited.

## Backups, deployment and rollback

Keep private, encrypted off-server backups of **both** PostgreSQL and the private-files volume, with
access restricted to operators. Pick a recovery objective explicitly; a reasonable initial target is
daily backups (up to 24 hours of data loss), with more frequent backups once paid traffic starts.
For a consistent small-installation snapshot, pause writes/stop the API during the database and file
backup, and resume it afterward. Never back up a live Postgres data directory with a plain filesystem copy.

Use `pg_dump -Fc -U platform_admin -d lawmedy` inside the database container for the database and
archive `lawmedy_private_files` separately. Record the application commit/image and migration version
with each backup. Test `pg_restore` and private-volume restoration into a separate stack before launch;
verify an authenticated sample PDF can be downloaded after restoration. Backups have not been run
against a production installation in this workspace.

Before each deployment, take/verify a backup, retain the prior image/package, apply migrations once,
check readiness, and smoke-test login/payment/private download. This initial single-process setup
has a maintenance window during replacement. Do not repeatedly rebuild/restart during active demos.
If a deploy fails before a schema change, restart the previous compatible image. After a schema
change, check compatibility before rolling code back; restore a tested backup only when needed and
with the resulting data-loss window understood. Never use `docker compose down -v` for a routine update.

### Provider configuration in the admin desk

Open `/admin/configuration` while signed in as an administrator. Search filters the payment, AI and change-history sections. Users and advocates are rejected by the API even when they call the configuration endpoints directly.

Before the first use on each deployment, set `CONFIG_ENCRYPTION_KEY` to 32 random bytes encoded as 64 hex characters and apply database migrations. Generate it with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it in the host's secret environment, and keep a recovery copy separate from database backups. This is the one-time host setup needed for dashboard-managed secrets. Do not change or remove it without a planned re-encryption of the stored credentials; losing it makes those credentials unreadable.

At first startup the API imports the existing Razorpay and Gemini environment credentials into encrypted database records. After this initialization the dashboard owns these settings. Editing those `.env` provider values no longer overwrites dashboard changes. If the encryption key is absent, the API keeps the existing environment-driven behavior and disables dashboard writes. A corrupt ciphertext or wrong encryption key fails startup instead of silently reverting to other credentials.

Payment settings have independent live and test Key IDs, Key Secrets and Webhook Secrets. Save all three values for a mode before activating it. Empty replacement fields retain the stored values. Switching mode applies to new orders; existing orders remain pinned to the credential version used to create them. Old versions are retained encrypted for pending checkout verification and delayed webhook retries. The API rejects a webhook signed with test credentials for a live order, and vice versa. Old credentials must still be valid at Razorpay for provider-side payment status checks.

Register the webhook separately in each Razorpay dashboard mode at `https://<public-api-domain>/payments/razorpay/webhook`, subscribe to `payment.captured`, and enter the same secret saved for that mode. Dashboard edits in Lawmedy do not register or update webhooks at Razorpay. Keep old webhook secrets available for Razorpay's retries. Live-mode checkout creates real charges.

Gemini keys have a label, priority and enabled state. The lowest priority number is primary. Additional enabled keys are backups, tried for key rejection, quota limits or provider outages within the existing overall request deadline. Quota is generally shared by keys in the same Google Cloud project, so adding a same-project key does not create extra quota. Every Gemini provider attempt is recorded in `ai_runs` with the model, credential reference, input digest, output, usage and safe result code; secret values never enter audit logs or responses. Updating the primary and fallback model identifiers takes effect for new requests. Backups improve credential resilience but cannot guarantee service during a provider-wide outage.

The API process handling a configuration save refreshes immediately. Other running API processes refresh their snapshot every five seconds. Configuration changes use a database revision check to reject concurrent stale updates. Reads return only labels, presence flags and the last four characters of a Razorpay Key ID. Secrets are never returned for prefilling forms.
