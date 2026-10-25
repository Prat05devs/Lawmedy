// Run through verify-integration.mjs: real disposable database, deterministic provider fixtures.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const { PrismaClient } = require("@prisma/client");
const { DocumentsService } = require("./dist/documents/documents.service.js");
const { AdvocateService } = require("./dist/advocate/advocate.service.js");
const { FinalDocumentService } = require("./dist/final-document/final-document.service.js");
const { LocalPrivateStorage } = require("./dist/evidence/storage.service.js");
const { PaymentService } = require("./dist/payment/payment.service.js");
const PDFDocument = require("pdfkit");
const db = new PrismaClient();
const base = process.env.API_URL;
assert.ok(process.env.DATABASE_URL?.includes("/lawmedy_verify"), "Use only the isolated verification database");
const password = `Test-${randomUUID()}`;
async function request(url, token, body, status = 200) {
  const form = body instanceof FormData;
  const response = await fetch(`${base}${url}`, { method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !form ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: form ? body : JSON.stringify(body) } : {}) });
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, status, `${url}: expected ${status}; received ${response.status}`);
  return data;
}
async function account(name) {
  const email = `${name.toLowerCase().replace(/[^a-z]/g, "")}-${randomUUID()}@example.test`;
  return request("/auth/signup", null, { email, password, fullName: name }, 201);
}
try {
  const owner = await account("Lender");
  const advocate = await account("Inhouse Advocate");
  const stranger = await account("Other User");
  await db.user.update({ where: { id: advocate.user.id }, data: { role: "ADVOCATE" } });
  const matter = await request("/matters", owner.accessToken, { type: "LENDING_CERTIFICATE" }, 201);
  const statement = await db.matterStatement.create({ data: { matterId: matter.id, statement: "I paid Asha Rao ₹5,000 on 1 October 2026 by UPI, reference TEST123456, as a loan." } });
  await db.matter.update({ where: { id: matter.id }, data: { currentStatementId: statement.id, status: "READY_FOR_PAYMENT", applicantAddress: "1 Lender Road, Bengaluru 560001" } });
  await db.matterRecipient.create({ data: { matterId: matter.id, name: "Asha Rao", address: "2 Borrower Road, Bengaluru 560002" } });
  const fact = await db.caseFact.create({ data: { matterId: matter.id, type: "transfer", value: { text: statement.statement, normalized: statement.statement, sourceLabel: "Statement" }, source: "STATEMENT", sourceId: statement.id, confirmedByUser: true } });
  const values = { ...process.env, PAYMENT_MODE: "manual", RAZORPAY_KEY_ID: "rzp_test_fixture", RAZORPAY_KEY_SECRET: "fixture-private-secret", LENDING_CERTIFICATE_PRICE_PAISE: "19900" };
  const config = { get: (key, fallback) => values[key] ?? fallback };
  const storage = new LocalPrivateStorage(config);
  const finals = new FinalDocumentService(db, storage, { sendReady: async () => ({ status: "SKIPPED_CONFIGURATION" }) }, config);
  const advocates = new AdvocateService(db, storage, finals);
  const modelResponse = (value) => ({ text: JSON.stringify(value), raw: { fixture: true }, inputTokens: 10, outputTokens: 10 });
  const gemini = {
    settings: () => ({ provider: "test-fixture", modelName: "deterministic-certificate" }), configured: () => true,
    generateCertificate: async () => modelResponse({ status: "READY", missingInformation: [],
      lender: { name: "Model name ignored", address: null }, borrower: { name: "Model name ignored", address: null },
      subject: "Record of money lent", paragraphs: [{ text: statement.statement, caseFactIds: [fact.id] }] }),
    qaCertificate: async () => modelResponse({ passed: true, issues: [], warnings: [] }),
  };
  const documents = new DocumentsService(db, gemini, advocates, finals, storage);
  let generation;
  let createCalls = 0;
  let captured = false;
  const keySecret = values.RAZORPAY_KEY_SECRET;
  const provider = {
    settings: () => ({ configured: true, keyId: values.RAZORPAY_KEY_ID, keySecret, mode: "razorpay", link: "" }),
    versions: () => [{ configured: true, keyId: values.RAZORPAY_KEY_ID, keySecret }],
    createOrder: async ({ amount }) => { assert.equal(amount, 19900); createCalls++; await new Promise((r) => setTimeout(r, 30)); return { id: `order_${randomUUID().replaceAll("-", "")}` }; },
    fetchPayment: async (id) => ({ id, orderId: order.orderId, amount: 19900, currency: "INR", status: captured ? "captured" : "authorized" }),
  };
  const payments = new PaymentService(db, provider, config, { generateAfterPayment: (id) => { generation = documents.generateAfterPayment(id); return generation; } });
  assert.equal(payments.manualSettings().mode, "razorpay", "API keys bypass the old manual setting");
  const [order, duplicate] = await Promise.all([payments.createOrder(owner.user.id, matter.id), payments.createOrder(owner.user.id, matter.id)]);
  assert.equal(createCalls, 1, "Concurrent clients reuse one provider order");
  assert.equal(order.orderId, duplicate.orderId);
  assert.equal(order.amount, 19900);
  const receipt = { orderId: order.orderId, paymentId: "pay_fixture", signature: createHmac("sha256", keySecret).update(`${order.orderId}|pay_fixture`).digest("hex") };
  await assert.rejects(() => payments.verifyCheckout(stranger.user.id, matter.id, receipt));
  assert.deepEqual(await payments.verifyCheckout(owner.user.id, matter.id, receipt), { status: "PENDING" });
  assert.equal((await db.matter.findUnique({ where: { id: matter.id } })).status, "READY_FOR_PAYMENT");
  captured = true;
  await payments.verifyCheckout(owner.user.id, matter.id, receipt);
  await generation;
  assert.equal((await db.matter.findUnique({ where: { id: matter.id } })).status, "UNDER_ADVOCATE_REVIEW");
  const runs = await db.aiRun.findMany({ where: { matterId: matter.id } });
  assert.equal(runs.filter((r) => r.status === "SUCCEEDED").length, 2, "Generation and QA are retained");
  const draft = await db.legalDocument.findFirst({ where: { matterId: matter.id }, include: { versions: true } });
  assert.equal(draft.versions[0].content.lender.name, "Lender", "Verified parties replace model identities");
  await request(`/advocate/matters/${matter.id}/approve`, advocate.accessToken, { confirmed: true }, 409);
  await assert.rejects(() => finals.generateAndDeliver(matter.id), /assigned advocate/);
  const pdf = await new Promise((resolve) => { const doc = new PDFDocument(); const chunks = []; doc.on("data", (b) => chunks.push(b)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.text("TEST FIXTURE - INHOUSE ADVOCATE LETTERHEAD\nLending certificate\nReviewed, signed and stamped test fixture."); doc.end(); });
  const form = (version = 1) => { const data = new FormData(); data.set("expectedVersion", String(version)); data.set("confirmed", "true"); data.set("file", new Blob([pdf], { type: "application/pdf" }), "signed-certificate.pdf"); return data; };
  await request(`/advocate/matters/${matter.id}/certificate-final`, stranger.accessToken, form(), 403);
  await request(`/advocate/matters/${matter.id}/certificate-final`, advocate.accessToken, form(2), 409);
  await request(`/advocate/matters/${matter.id}/certificate-final`, advocate.accessToken, form());
  await request(`/advocate/matters/${matter.id}/certificate-final`, advocate.accessToken, form(), 409);
  const final = await request(`/matters/${matter.id}/final-document`, owner.accessToken);
  assert.equal(final.state, "READY");
  const query = final.downloadUrl.slice(final.downloadUrl.indexOf("?"));
  const download = `/matters/${matter.id}/final-document/file${query}`;
  assert.deepEqual(await request(download, owner.accessToken), pdf, "The actual advocate-uploaded PDF is delivered");
  await request(download, stranger.accessToken, undefined, 404);
  assert.equal((await db.matter.findUnique({ where: { id: matter.id } })).status, "COMPLETED");
  assert.ok(await db.auditLog.findFirst({ where: { action: "SIGNED_LENDING_CERTIFICATE_DELIVERED", actorId: advocate.user.id } }));
  console.log("PASS: automatic Razorpay selection, concurrent-order reuse, capture verification, ₹199 certificate generation/QA, mandatory advocate upload, private download and audit history.");
} finally { await db.$disconnect(); }
