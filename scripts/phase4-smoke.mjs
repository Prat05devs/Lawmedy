import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import prismaClient from "../apps/api/node_modules/@prisma/client/default.js";

const { PrismaClient } = prismaClient;
const origin = process.env.API_URL || "http://127.0.0.1:4000";
const webhookSecret =
  process.env.RAZORPAY_WEBHOOK_SECRET ||
  "phase4-local-webhook-secret-at-least-32-characters";
const db = new PrismaClient();
const suffix = randomUUID();
const password = `Test-${randomUUID()}`;

async function request(
  path,
  { token, body, rawBody, headers = {}, status = 200 } = {},
) {
  const response = await fetch(`${origin}${path}`, {
    method: body || rawBody ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(rawBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(rawBody ? { body: rawBody } : {}),
  });
  const data = await response.json().catch(() => ({}));
  assert.equal(
    response.status,
    status,
    `${path}: expected ${status}, got ${response.status}: ${JSON.stringify(data)}`,
  );
  return data;
}

try {
  const owner = await request("/auth/signup", {
    body: {
      email: `phase4-owner-${suffix}@example.test`,
      password,
      fullName: "Phase Four Owner",
    },
    status: 201,
  });
  const stranger = await request("/auth/signup", {
    body: {
      email: `phase4-stranger-${suffix}@example.test`,
      password,
      fullName: "Phase Four Stranger",
    },
    status: 201,
  });
  const matter = await request("/matters", {
    token: owner.accessToken,
    body: { type: "LEGAL_NOTICE" },
    status: 201,
  });
  const statement = await request(`/matters/${matter.id}/statement`, {
    token: owner.accessToken,
    body: {
      statement:
        "I transferred ₹50,000 to Asha Rao on 2 March 2026 and it has not been returned.",
    },
    status: 201,
  });

  const analysisRun = await db.aiRun.create({
    data: {
      matterId: matter.id,
      taskType: "CASE_CLASSIFICATION",
      provider: "test-fixture",
      modelName: "deterministic-fixture",
      promptVersion: "case-classification-v1",
      inputReference: statement.id,
      output: { fixture: true },
      status: "SUCCEEDED",
      expiresAt: new Date(),
      finishedAt: new Date(),
    },
  });
  await db.matterAiAnalysis.create({
    data: {
      matterId: matter.id,
      statementId: statement.id,
      aiRunId: analysisRun.id,
      category: "MONEY_RECOVERY",
      summary: "A transfer has not been returned.",
      facts: [
        {
          key: "amount",
          value: "₹50,000",
          sourceQuote: "₹50,000",
        },
        {
          key: "recipient_name",
          value: "Asha Rao",
          sourceQuote: "Asha Rao",
        },
      ],
      missingInformation: [],
    },
  });
  const evidenceRun = await db.aiRun.create({
    data: {
      matterId: matter.id,
      taskType: "EVIDENCE_EXTRACTION",
      provider: "test-fixture",
      modelName: "deterministic-fixture",
      promptVersion: "evidence-extraction-v1",
      inputReference: `fixture-${suffix}`,
      output: { fixture: true },
      status: "SUCCEEDED",
      expiresAt: new Date(),
      finishedAt: new Date(),
    },
  });
  const evidence = await db.evidence.create({
    data: {
      matterId: matter.id,
      uploadedBy: owner.user.id,
      originalFilename: "receipt-fixture.png",
      storageKey: `${matter.id}/${randomUUID()}`,
      mimeType: "image/png",
      sizeBytes: 68,
      sha256: "0".repeat(64),
      status: "PROCESSED",
    },
  });
  await db.evidenceExtraction.create({
    data: {
      evidenceId: evidence.id,
      aiRunId: evidenceRun.id,
      model: "deterministic-fixture",
      extraction: {
        documentType: "BANK_TRANSFER",
        summary: "Fixture transfer receipt.",
        confidence: 1,
        facts: [
          {
            field: "amount",
            value: "₹55,000",
            sourceText: "Amount ₹55,000",
          },
        ],
      },
      confidence: 1,
      status: "SUCCEEDED",
    },
  });

  const prepared = await request(`/matters/${matter.id}/review/prepare`, {
    token: owner.accessToken,
    body: {},
  });
  const amountGroup = prepared.factGroups.find(
    (group) => group.type === "amount",
  );
  assert.equal(amountGroup.conflict, true);
  assert.equal(amountGroup.values.length, 2);
  const chosen = amountGroup.values.find((value) => value.value === "₹50,000");
  assert.ok(chosen);

  const confirmed = await request(`/matters/${matter.id}/review/confirm`, {
    token: owner.accessToken,
    body: {
      selections: [{ type: "amount", caseFactId: chosen.id }],
      recipient: {
        name: "Asha Rao",
        address: "12 Test Road, Bengaluru, Karnataka 560001",
        phone: "+919876543210",
        email: "asha@example.test",
      },
      confirmed: true,
    },
  });
  assert.equal(confirmed.status, "READY_FOR_PAYMENT");
  await request(`/matters/${matter.id}/payment/order`, {
    token: owner.accessToken,
    body: {},
    status: 503,
  });
  await request(`/matters/${matter.id}/review`, {
    token: stranger.accessToken,
    status: 404,
  });

  const payment = await db.payment.create({
    data: {
      matterId: matter.id,
      provider: "razorpay",
      providerOrderId: `order_fixture_${suffix}`,
      amount: 29900,
      currency: "INR",
    },
  });
  const webhookBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_fixture_${suffix}`,
          order_id: payment.providerOrderId,
          amount: payment.amount,
          currency: payment.currency,
          status: "captured",
        },
      },
    },
  });
  const signature = createHmac("sha256", webhookSecret)
    .update(webhookBody)
    .digest("hex");
  await request("/payments/razorpay/webhook", {
    rawBody: webhookBody,
    headers: { "x-razorpay-signature": signature },
  });
  const paid = await request(`/matters/${matter.id}`, {
    token: owner.accessToken,
  });
  assert.equal(paid.status, "PAID");
  const storedPayment = await db.payment.findUnique({
    where: { id: payment.id },
  });
  assert.equal(storedPayment.status, "PAID");
  assert.ok(storedPayment.providerPaymentId);

  console.log(
    "PASS: reconciliation conflict, recipient confirmation, missing Razorpay configuration, signed webhook, paid state, and ownership isolation.",
  );
} finally {
  await db.$disconnect();
}
