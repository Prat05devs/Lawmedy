// Isolated, disposable PostgreSQL + API. Never reads the developer's database URL.
// First run: pnpm --filter @lawmedy/api build
import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { mkdtempSync, mkdirSync, openSync, closeSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const runtimeArg = process.argv.find((arg) => arg.startsWith("--api-runtime="));
const apiDir = runtimeArg ? path.resolve(root, runtimeArg.split("=")[1]) : path.join(root, "apps/api");
const temp = mkdtempSync(path.join(tmpdir(), "lawmedy-verification-"));
const password = randomBytes(24).toString("hex");
const pg = new EmbeddedPostgres({ databaseDir: path.join(temp, "postgres"), user: "lawmedy", password,
  port: 55439, persistent: false, authMethod: "scram-sha-256", initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-h", "127.0.0.1"] });
const databaseUrl = `postgresql://lawmedy:${password}@127.0.0.1:55439/lawmedy_verify?connection_limit=5&pool_timeout=20`;
const env = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
  CONFIG_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  JWT_SECRET: randomBytes(48).toString("hex"), FILE_SIGNING_SECRET: randomBytes(48).toString("hex"),
  API_URL: "http://127.0.0.1:4407", WEB_URL: "http://127.0.0.1:4408", HOST: "127.0.0.1", PORT: "4407", NODE_ENV: "test",
  GEMINI_API_KEY: "", GROQ_API_KEY: "", OPENROUTER_API_KEY: "", CLOUDFLARE_AI_TOKEN: "",
  RESEND_API_KEY: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", PAYMENT_MODE: "razorpay",
  RAZORPAY_WEBHOOK_SECRET: "phase4-local-webhook-secret-at-least-32-characters",
  STORAGE_DRIVER: "local", PRIVATE_STORAGE_DIR: path.join(temp, "files"), WEB_ORIGIN: "https://lawmedy.example" };
if (runtimeArg) env.NODE_ENV = "production";
const require = createRequire(path.join(apiDir, "package.json"));
function run(file, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(file)} exited ${code}`)));
  });
}
let server;
let serverStopped;
let webServer;
let webStopped;
try {
  await pg.initialise(); await pg.start(); await pg.createDatabase("lawmedy_verify");
  await run(require.resolve("prisma/build/index.js"), ["migrate", "deploy"], apiDir);
  mkdirSync(path.join(root, ".local"), { recursive: true });
  mkdirSync(path.join(root, ".local/security"), { recursive: true });
  const log = openSync(path.join(root, ".local/verification-api.log"), "w", 0o600);
  server = spawn(process.execPath, ["dist/main.js"], { cwd: apiDir, env, stdio: ["ignore", log, log] });
  closeSync(log);
  serverStopped = new Promise((resolve) => server.once("exit", resolve));
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("API exited; see .local/verification-api.log");
    if (await fetch(`${env.API_URL}/health/ready`).then((r) => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("API readiness timed out; see .local/verification-api.log");
  if (process.argv.includes("--security")) {
    const webRequire = createRequire(path.join(root, "apps/web/package.json"));
    const log = openSync(path.join(root, ".local/security/verification-web.log"), "w", 0o600);
    webServer = spawn(process.execPath, [webRequire.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "4408"], {
      cwd: path.join(root, "apps/web"), env: { ...env, NODE_ENV: "production", APP_ORIGIN: "http://127.0.0.1:4408" }, stdio: ["ignore", log, log],
    });
    closeSync(log);
    webStopped = new Promise((resolve) => webServer.once("exit", resolve));
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (webServer.exitCode !== null) throw new Error("Website exited; see .local/security/verification-web.log");
      if (await fetch(env.WEB_URL + "/login").then((r) => r.ok).catch(() => false)) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Website readiness timed out");
  }
  const scripts = ["smoke.mjs", "phase2-success-smoke.mjs", "phase3-smoke.mjs", "phase4-smoke.mjs", "payment-certificate-smoke.mjs", "configuration-smoke.mjs"];
  if (process.argv.includes("--security")) scripts.push("security-smoke.mjs");
  for (const script of scripts) await run(path.join(root, "scripts", script), []);
  console.log("PASS: isolated integration checks completed; no live providers or existing databases used.");
  if (process.argv.includes("--serve")) {
    console.log("Temporary verification API ready at http://127.0.0.1:4407; stop with Ctrl+C to remove the test database.");
    await new Promise((resolve) => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
  }
} finally {
  if (webServer && webServer.exitCode === null) { webServer.kill("SIGTERM"); await webStopped; }
  if (server && server.exitCode === null) { server.kill("SIGTERM"); await serverStopped; }
  await pg.stop().catch(() => undefined);
  rmSync(temp, { recursive: true, force: true });
}
