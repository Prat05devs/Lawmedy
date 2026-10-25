// Disposable local Docker stack: production Compose, Linux API and Caddy.
// Never use an existing project, database, environment file or provider keys.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, openSync, closeSync, rmSync, statfsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const disk = statfsSync(root);
assert.ok(disk.bavail * disk.bsize >= 5 * 1024 ** 3, "Free at least 5 GiB before Docker verification; image builds and disposable databases need disk headroom.");
const temp = mkdtempSync(path.join(tmpdir(), "lawmedy-docker-verification-"));
const output = path.join(root, ".local/security");
mkdirSync(output, { recursive: true });
const project = `lawmedy-verification-${randomBytes(4).toString("hex")}`;
const password = randomBytes(32).toString("hex");
const jwtSecret = randomBytes(48).toString("hex");
const fileSecret = randomBytes(48).toString("hex");
const connection = `postgresql://lawmedy:${password}@postgres:5432/lawmedy_verify?connection_limit=5&pool_timeout=20`;
writeFileSync(path.join(temp, ".env"), [
  "API_DOMAIN=:80", "ACME_EMAIL=verification@example.test", `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`,
  `LAWMEDY_DB_PASSWORD=${password}`, `DATABASE_URL=${connection}`, `DIRECT_URL=${connection}`,
  `CONFIG_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`, `JWT_SECRET=${jwtSecret}`, `FILE_SIGNING_SECRET=${fileSecret}`, "WEB_ORIGIN=https://lawmedy.example",
  "AI_PROVIDER=gemini", "GEMINI_API_KEY=", "GEMINI_MODEL=", "PAYMENT_MODE=razorpay",
  "RAZORPAY_KEY_ID=", "RAZORPAY_KEY_SECRET=", "RAZORPAY_WEBHOOK_SECRET=phase4-local-webhook-secret-at-least-32-characters",
].join("\n"), { mode: 0o600 });
// Only the disposable test stack publishes a loopback database port. Production
// Compose publishes neither the database nor the API. No public TLS/ACME requests.
writeFileSync(path.join(temp, "override.yaml"), `services:
  postgres:
    ports: ["127.0.0.1:55439:5432"]
  api:
    image: lawmedy-api:security-review
    pull_policy: never
  caddy:
    ports: !override ["127.0.0.1:4407:80"]
`);
const composeArgs = ["compose", "--project-name", project, "--env-file", path.join(temp, ".env"),
  "-f", path.join(root, "deploy/vps/compose.yaml"), "-f", path.join(temp, "override.yaml")];
const log = openSync(path.join(output, "vps-containers.log"), "w", 0o600);
function docker(args, capture = false) {
  const result = spawnSync("docker", args, { cwd: root, stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", log, log], encoding: "utf8", timeout: 300_000 });
  if (result.status !== 0) throw new Error(`Docker command failed (${args[0]}); see .local/security/vps-containers.log`);
  return result.stdout?.trim();
}
const compose = (args, capture = false) => docker([...composeArgs, ...args], capture);
const env = { ...process.env, DATABASE_URL: connection.replace("@postgres:5432", "@127.0.0.1:55439"),
  DIRECT_URL: connection.replace("@postgres:5432", "@127.0.0.1:55439"), JWT_SECRET: jwtSecret, FILE_SIGNING_SECRET: fileSecret,
  API_URL: "http://127.0.0.1:4407", WEB_URL: "http://127.0.0.1:4408", APP_ORIGIN: "http://127.0.0.1:4408",
  NODE_ENV: "production", GEMINI_API_KEY: "", GROQ_API_KEY: "", OPENROUTER_API_KEY: "", CLOUDFLARE_AI_TOKEN: "",
  RESEND_API_KEY: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", RAZORPAY_WEBHOOK_SECRET: "phase4-local-webhook-secret-at-least-32-characters" };
function run(file, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(file)} exited ${code}`)));
  });
}
let web;
let webStopped;
try {
  compose(["up", "-d", "--wait", "postgres"]);
  // Verify the real role/database initializer, then give its new database the
  // fixture-only name enforced by the existing integration scripts.
  compose(["exec", "-T", "postgres", "psql", "-U", "platform_admin", "-d", "postgres", "-c", "ALTER DATABASE lawmedy RENAME TO lawmedy_verify"]);
  compose(["up", "-d", "--no-build", "--wait"]);
  const id = compose(["ps", "-q", "api"], true);
  const inspection = JSON.parse(docker(["inspect", id], true))[0];
  assert.equal(inspection.Config.User, "node");
  assert.equal(inspection.HostConfig.Memory, 768 * 1024 * 1024);
  assert.ok(inspection.HostConfig.CapDrop.includes("ALL"));
  assert.ok(!inspection.NetworkSettings.Ports?.["4000/tcp"]?.length, "API port must stay private");
  assert.equal(compose(["exec", "-T", "api", "id", "-u"], true), "1000");
  assert.ok((await fetch(env.API_URL + "/health/ready")).ok);
  const webRequire = createRequire(path.join(root, "apps/web/package.json"));
  const webLog = openSync(path.join(output, "vps-web.log"), "w", 0o600);
  web = spawn(process.execPath, [webRequire.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "4408"],
    { cwd: path.join(root, "apps/web"), env, stdio: ["ignore", webLog, webLog] });
  closeSync(webLog);
  webStopped = new Promise((resolve) => web.once("exit", resolve));
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (web.exitCode !== null) throw new Error("Website exited; see vps-web.log");
    if (await fetch(env.WEB_URL + "/login").then((r) => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Website readiness");
  for (const script of ["smoke.mjs", "phase2-success-smoke.mjs", "phase3-smoke.mjs", "phase4-smoke.mjs", "payment-certificate-smoke.mjs", "security-smoke.mjs"])
    await run(path.join(root, "scripts", script));
  const uid = compose(["exec", "-T", "api", "node", "-e", "console.log(require('node:fs').statSync('/var/lib/lawmedy/private').uid)"], true);
  assert.equal(uid, "1000", "Private storage must belong to the unprivileged API user");
  writeFileSync(path.join(output, "vps-stats.jsonl"), docker(["stats", "--no-stream", "--format", "{{json .}}", ...compose(["ps", "-q"], true).split(/\s+/)], true));
  console.log("PASS: Linux API + PostgreSQL + Caddy, non-root/private API, resource configuration, all integration/security checks.");
} finally {
  if (web && web.exitCode === null) { web.kill("SIGTERM"); await webStopped; }
  try { compose(["logs", "--no-color"]); } catch { /* retain the original failure */ }
  try { compose(["down", "-v", "--remove-orphans"]); } finally { closeSync(log); rmSync(temp, { recursive: true, force: true }); }
}
