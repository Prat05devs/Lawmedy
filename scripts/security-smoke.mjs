// Adversarial checks against the disposable API and production Next.js server.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
assert.ok(process.env.DATABASE_URL?.includes("/lawmedy_verify"), "Only run against the disposable verification database");
const base = process.env.API_URL;
const web = process.env.WEB_URL;
const results = [];
const timings = [];
const password = `Security-${randomUUID()}`;
async function check(name, test) {
  try { await test(); results.push({ name, passed: true }); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.error(`FAIL: ${name}: ${e.message}`); }
}
async function request(path, { token, body, method, headers = {}, status = 200 } = {}) {
  const form = body instanceof FormData;
  const r = await fetch(`${base}${path}`, { method: method || (body ? "POST" : "GET"),
    signal: AbortSignal.timeout(15_000),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !form ? { "Content-Type": "application/json" } : {}), ...headers },
    ...(body ? { body: form ? body : JSON.stringify(body) } : {}) });
  assert.equal(r.status, status, `${path}: expected ${status}, received ${r.status}`);
  const data = r.headers.get("content-type")?.includes("application/json") ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { data, headers: r.headers };
}
async function account(role = "USER") {
  const email = `security-${randomUUID()}@example.test`;
  const { data } = await request("/auth/signup", { body: { email, password, fullName: "Security Test" }, status: 201 });
  if (role !== "USER") await db.user.update({ where: { id: data.user.id }, data: { role } });
  return { ...data, email };
}
const upload = (bytes, type = "application/pdf", name = "evidence.pdf") => {
  const form = new FormData(); form.set("file", new Blob([bytes], { type }), name); return form;
};
function jwt(payload, algorithm = "HS256") {
  const header = Buffer.from(JSON.stringify({ alg: algorithm, typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.${algorithm === "none" ? "" : createHmac("sha256", process.env.JWT_SECRET).update(`${header}.${body}`).digest("base64url")}`;
}
try {
  const owner = await account(); const other = await account(); const adv = await account("ADVOCATE");
  const unassigned = await account("ADVOCATE"); const admin = await account("ADMIN");
  const { data: matter } = await request("/matters", { token: owner.accessToken, body: { type: "LEGAL_NOTICE" }, status: 201 });
  for (const path of ["/users/me", "/matters", "/admin/dashboard", "/admin/operations", "/advocate/matters"])
    await check(`anonymous denied ${path}`, () => request(path, { status: 401 }));
  const claims = { sub: owner.user.id, ver: 0, iss: "lawmedy-api", aud: "lawmedy", exp: Math.floor(Date.now() / 1000) + 600 };
  for (const [name, token] of [
    ["unsigned JWT", jwt(claims, "none")], ["wrong issuer", jwt({ ...claims, iss: "other" })],
    ["wrong audience", jwt({ ...claims, aud: "other" })], ["expired JWT", jwt({ ...claims, exp: 1 })],
    ["forged signature", owner.accessToken.slice(0, -10) + "0000000000"], ["missing version", jwt({ ...claims, ver: undefined })],
  ]) await check(name, () => request("/matters", { token, status: 401 }));
  await check("signup cannot assign ADMIN role", () => request("/auth/signup", { body: { email: `bad-${randomUUID()}@example.test`, password, fullName: "Attempt", role: "ADMIN" }, status: 400 }));
  for (const token of [owner.accessToken, adv.accessToken])
    await check("non-admin denied dashboard and operations", async () => { await request("/admin/dashboard", { token, status: 403 }); await request("/admin/operations", { token, status: 403 }); });
  await check("ordinary user cannot enter advocate workspace", () => request("/advocate/matters", { token: owner.accessToken, status: 403 }));
  for (const suffix of ["", "/overview", "/intake", "/evidence", "/review", "/document", "/advocate-requests", "/final-document", "/rti-details"])
    await check(`cross-owner read denied ${suffix || "/matter"}`, () => request(`/matters/${matter.id}${suffix}`, { token: other.accessToken, status: 404 }));
  await check("cross-owner statement mutation denied", () => request(`/matters/${matter.id}/statement`, { token: other.accessToken, body: { statement: "Malicious replacement" }, status: 404 }));
  await check("cross-owner upload denied", () => request(`/matters/${matter.id}/evidence`, { token: other.accessToken, body: upload("%PDF-1.4\n%%EOF"), status: 404 }));
  await check("SQL-like matter identifier rejected", () => request("/matters/%27%20OR%201%3D1--", { token: owner.accessToken, status: 400 }));
  await check("missing nested applicant fails validation", () => request(`/matters/${matter.id}/review/confirm`, { token: owner.accessToken, body: { selections: [], confirmed: true }, status: 400 }));
  for (const [name, bytes, type] of [["HTML masquerading as PDF", "<script>alert(1)</script>", "application/pdf"], ["SVG uploads", "<svg/>", "image/svg+xml"], ["empty upload", "", "application/pdf"]])
    await check(name, () => request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body: upload(bytes, type), status: 400 }));
  await check("oversized upload blocked", () => request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body: upload(Buffer.alloc(10 * 1024 * 1024 + 1)), status: 413 }));
  await check("unexpected multipart fields rejected", async () => {
    const body = upload("%PDF-1.4\n%%EOF"); body.set("unbounded", "x");
    await request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body, status: 400 });
  });
  const { data: file } = await request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body: upload("%PDF-1.4\n%%EOF", "application/pdf", "../../unsafe.pdf"), status: 201 });
  await check("storage key is not disclosed", () => { assert.equal(file.storageKey, undefined); assert.ok(!file.originalFilename.includes("/")); });
  await check("signed file still requires login", () => request(file.viewUrl, { status: 401 }));
  await check("signed file is bound to owner", () => request(file.viewUrl, { token: other.accessToken, status: 400 }));
  await check("tampered and expired signatures rejected", async () => {
    await request(file.viewUrl + "z", { token: owner.accessToken, status: 400 });
    await request(file.viewUrl.replace(/expires=\d+/, "expires=1"), { token: owner.accessToken, status: 400 });
  });
  await check("private file responses cannot be cached", async () => { const r = await request(file.viewUrl, { token: owner.accessToken }); assert.match(r.headers.get("cache-control"), /no-store/); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); });
  await check("multipart capacity rejects excess work and recovers after client disconnect", async () => {
    const held = [];
    try {
      for (let i = 0; i < 2; i++) {
        const pending = httpRequest(`${base}/matters/${matter.id}/evidence`, { method: "POST", headers: {
          Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "multipart/form-data; boundary=held-upload", "Transfer-Encoding": "chunked",
        } });
        pending.on("error", () => undefined); pending.on("response", (r) => r.resume());
        pending.write('--held-upload\r\nContent-Disposition: form-data; name="file"; filename="proof.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\n');
        held.push(pending);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      const excess = await request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body: upload("%PDF-1.4\n%%EOF"), status: 503 });
      assert.equal(excess.headers.get("retry-after"), "2");
    } finally { held.forEach((r) => r.destroy()); }
    await new Promise((resolve) => setTimeout(resolve, 300));
    await request(`/matters/${matter.id}/evidence`, { token: owner.accessToken, body: upload("%PDF-1.4\n%%EOF"), status: 201 });
  });
  await check("unassigned advocate cannot read evidence", () => request(`/advocate/matters/${matter.id}/evidence/${file.id}/file`, { token: unassigned.accessToken, status: 404 }));
  await check("unassigned advocate cannot approve", () => request(`/advocate/matters/${matter.id}/approve`, { token: unassigned.accessToken, body: { confirmed: true }, status: 404 }));
  await check("CORS does not authorize an attacker origin", async () => {
    const r = await request("/public/pricing", { headers: { Origin: "https://attacker.example" } });
    assert.notEqual(r.headers.get("access-control-allow-origin"), "https://attacker.example");
    assert.notEqual(r.headers.get("access-control-allow-origin"), "*");
  });
  await check("disabled account token blocked on ordinary API routes", async () => {
    await db.user.update({ where: { id: other.user.id }, data: { active: false } });
    await request("/matters", { token: other.accessToken, status: 401 });
  });
  await check("password reset invalidates advocate sessions", async () => {
    await request(`/admin/advocates/${adv.user.id}/password`, { token: admin.accessToken, body: { password: `Reset-${randomUUID()}` } });
    await request("/advocate/matters", { token: adv.accessToken, status: 401 });
  });
  await check("logout revokes copied tokens", async () => {
    await request("/auth/logout", { token: unassigned.accessToken, method: "POST" });
    await request("/matters", { token: unassigned.accessToken, status: 401 });
  });
  await check("deleted account cannot reuse token to create matters", async () => {
    const deleted = await account(); await request("/users/me", { token: deleted.accessToken, method: "DELETE", body: { confirm: "DELETE" } });
    await request("/matters", { token: deleted.accessToken, body: { type: "LEGAL_NOTICE" }, status: 401 });
  });
  await check("unsigned webhook cannot mark order paid", async () => {
    await request("/payments/razorpay/webhook", { body: { event: "payment.captured" }, status: 401 });
    assert.equal((await db.matter.findUnique({ where: { id: matter.id } })).status, "DRAFT");
  });
  await check("per-account login throttling cannot be bypassed by spoofed IP headers", async () => {
    for (let i = 0; i < 10; i++) await request("/auth/login", { body: { email: "throttle@example.test", password: "wrong-password" }, headers: { "X-Forwarded-For": `192.0.2.${i}` }, status: 401 });
    await request("/auth/login", { body: { email: "throttle@example.test", password: "wrong-password" }, headers: { "X-Forwarded-For": "192.0.2.250" }, status: 429 });
  });
  if (web) {
    const manifest = JSON.parse(readFileSync(new URL("../apps/web/.next/server/server-reference-manifest.json", import.meta.url)));
    const actionId = Object.entries(manifest.node).find(([, v]) => v.exportedName === "logout")[0];
    for (const spoof of [false, true]) await check(`web CSRF blocked${spoof ? " with spoofed forwarded host" : ""}`, async () => {
      const before = (await db.user.findUnique({ where: { id: owner.user.id } })).tokenVersion;
      const r = await fetch(`${web}/dashboard`, { method: "POST", headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8", Origin: "https://attacker.example", Cookie: `lawmedy_session=${owner.accessToken}`, ...(spoof ? { "X-Forwarded-Host": "attacker.example" } : {}) }, body: "[]", redirect: "manual" });
      await r.arrayBuffer();
      assert.equal((await db.user.findUnique({ where: { id: owner.user.id } })).tokenVersion, before, "Cross-site request executed a state-changing action");
      assert.ok(r.status >= 400, `Expected rejection, received ${r.status}`);
    });
    await check("same-origin web actions still work", async () => {
      const r = await fetch(`${web}/dashboard`, { method: "POST", headers: { "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8", Origin: web, Cookie: `lawmedy_session=${admin.accessToken}` }, body: "[]", redirect: "manual" });
      await r.arrayBuffer();
      assert.ok(r.status < 400, `Same-origin action returned ${r.status}`);
      assert.equal((await db.user.findUnique({ where: { id: admin.user.id } })).tokenVersion, 1);
      admin.accessToken = (await request("/auth/login", { body: { email: admin.email, password } })).data.accessToken;
    });
    await check("web role gates and sensitive paths", async () => {
      for (const path of ["/admin", "/advocate"]) { const r = await fetch(`${web}${path}`, { headers: { Cookie: `lawmedy_session=${owner.accessToken}` }, redirect: "manual" }); assert.ok([303, 307].includes(r.status)); }
      for (const path of ["/.env", "/.git/config"]) assert.equal((await fetch(`${web}${path}`)).status, 404);
    });
    await check("authenticated user, admin and advocate pages render", async () => {
      const staff = await account("ADVOCATE");
      for (const [path, token] of [["/dashboard", owner.accessToken], ["/admin", admin.accessToken],
        ["/admin/operations", admin.accessToken], ["/admin/matters", admin.accessToken],
        ["/admin/payments", admin.accessToken], ["/advocate", staff.accessToken]]) {
        const response = await fetch(web + path, { headers: { Cookie: `lawmedy_session=${token}` }, redirect: "manual", signal: AbortSignal.timeout(15_000) });
        assert.equal(response.status, 200, `${path} should render for the correct role`);
        const html = await response.text();
        if (path === "/admin/operations") assert.ok(html.includes("API operations") && html.includes("Process memory"));
      }
    });
  }
  await check("overlapping extraction workers claim one AI attempt", async () => {
    const { EvidenceService } = require("./dist/evidence/evidence.service.js");
    await db.evidence.update({ where: { id: file.id }, data: { status: "PROCESSING" } });
    let calls = 0;
    const service = new EvidenceService(db, { read: async () => Buffer.from("%PDF-fixture") }, {
      settings: () => ({ provider: "test-fixture", modelName: "deterministic" }),
      extractEvidence: async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 75));
        return { text: JSON.stringify({ documentType: "RECEIPT", summary: "Fixture receipt", confidence: 1, facts: [] }), raw: {}, inputTokens: 1, outputTokens: 1 }; },
    }, { get: (key, fallback) => key === "FILE_SIGNING_SECRET" ? process.env.FILE_SIGNING_SECRET : fallback });
    await Promise.all(Array.from({ length: 5 }, () => service.process(owner.user.id, matter.id, file.id)));
    assert.equal(calls, 1);
    assert.equal(await db.aiRun.count({ where: { inputReference: file.id, taskType: "EVIDENCE_EXTRACTION", status: "SUCCEEDED" } }), 1);
  });
  // Exercise the full intake/review overview, not only an empty matter.
  const statement = await db.matterStatement.create({ data: { matterId: matter.id, statement: "I transferred ₹5,000 to a borrower on 1 October 2026 and want my loan repaid." } });
  await db.matter.update({ where: { id: matter.id }, data: { currentStatementId: statement.id, status: "INTAKE_IN_PROGRESS" } });
  const run = await db.aiRun.create({ data: { matterId: matter.id, taskType: "CASE_CLASSIFICATION", provider: "test-fixture", modelName: "deterministic-security-fixture", promptVersion: "security-v1", inputReference: statement.id, status: "SUCCEEDED", expiresAt: new Date() } });
  await db.matterAiAnalysis.create({ data: { matterId: matter.id, statementId: statement.id, aiRunId: run.id, category: "MONEY_RECOVERY", summary: "Reported unpaid loan.", facts: [{ key: "amount", value: "₹5,000", sourceQuote: "₹5,000" }], missingInformation: [] } });
  // A concurrency smoke test on this computer, not a certification of VPS capacity.
  for (const concurrent of [50, 100]) {
    for (const [label, path, token] of [["matter overview", `/matters/${matter.id}/overview`, owner.accessToken], ["admin dashboard", "/admin/dashboard", admin.accessToken]]) {
      const samples = []; let errors = 0; const start = performance.now();
      await Promise.all(Array.from({ length: concurrent }, async () => { const t = performance.now(); try { await request(path, { token }); } catch { errors++; } samples.push(performance.now() - t); }));
      samples.sort((a, b) => a - b);
      timings.push({ endpoint: label, concurrent, p50Ms: Math.round(samples[Math.floor(samples.length * .5)]), p95Ms: Math.round(samples[Math.floor(samples.length * .95)]), totalMs: Math.round(performance.now() - start), errors });
    }
  }
  await check("concurrency smoke completed without errors", () => assert.ok(timings.every((t) => t.errors === 0)));
} finally {
  await db.$disconnect();
  writeFileSync(new URL("../.local/security/security-results.json", import.meta.url), JSON.stringify({ results, timings }, null, 2));
}
console.log(`Security checks: ${results.filter((r) => r.passed).length}/${results.length} passed.`);
console.log(JSON.stringify(timings));
if (results.some((r) => !r.passed)) process.exitCode = 1;
