// Runs only inside verify-integration.mjs against its disposable database. No live providers.
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { PrismaClient } = require("@prisma/client");
const { ConfigService } = require("@nestjs/config");
const {
  ProviderConfigurationService,
} = require("./dist/configuration/configuration.service.js");
const { RazorpayService } = require("./dist/payment/razorpay.service.js");
const { PaymentService } = require("./dist/payment/payment.service.js");
const { AccountService } = require("./dist/account.service.js");
assert.ok(
  process.env.DATABASE_URL?.includes("/lawmedy_verify"),
  "Use only the isolated verification database",
);
const db = new PrismaClient();
const base = process.env.API_URL;
const password = `Test-${randomUUID()}`;
async function request(path, token, body, status = 200) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${path}: expected ${status}, received ${response.status}`,
  );
  return data;
}
async function account(role) {
  const value = await request(
    "/auth/signup",
    null,
    {
      fullName: `Configuration ${role}`,
      email: `config-${randomUUID()}@example.test`,
      password,
    },
    201,
  );
  if (role !== "USER")
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: value.user.id }, data: { role } });
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          actorId: "verification",
          action: "TEST_FIXTURE_ROLE_ASSIGNED",
          entityType: "User",
          entityId: value.user.id,
        },
      });
    });
  return value;
}
const endpoint = "/admin/configuration";
const test = {
  keyId: "rzp_test_fixtureOriginal",
  keySecret: "test-api-secret-original-fixture",
  webhookSecret: "test-webhook-secret-original-fixture",
};
const live = {
  keyId: "rzp_live_fixtureOriginal",
  keySecret: "live-api-secret-original-fixture",
  webhookSecret: "live-webhook-secret-original-fixture",
};
let runtime;
try {
  const admin = await account("ADMIN"),
    user = await account("USER"),
    advocate = await account("ADVOCATE");
  await request(endpoint, null, null, 401);
  for (const account of [user, advocate]) {
    await request(endpoint, account.accessToken, null, 403);
    await request(
      endpoint + "/payment-mode",
      account.accessToken,
      { mode: "live" },
      403,
    );
    await request(endpoint + "/razorpay/test", account.accessToken, test, 403);
    await request(
      endpoint + "/gemini/keys",
      account.accessToken,
      {
        label: "Unauthorized",
        apiKey: "fixture-google-key-never-saved",
        enabled: true,
        priority: 0,
      },
      403,
    );
  }
  const token = admin.accessToken;
  await request(endpoint + "/payment-mode", token, { mode: "live" }, 400);
  await request(endpoint + "/razorpay/live", token, test, 400);
  await request(
    endpoint + "/razorpay/test",
    token,
    { ...test, unexpected: true },
    400,
  );
  await request(endpoint + "/razorpay/test", token, test);
  await request(endpoint + "/payment-mode", token, { mode: "test" });
  const config = new ConfigService({
    ...process.env,
    LEGAL_NOTICE_PRICE_PAISE: "29900",
  });
  runtime = new ProviderConfigurationService(db, config);
  await runtime.onModuleInit();
  const gateway = new RazorpayService(config, runtime);
  gateway.createOrder = async () => ({ id: `order_${randomUUID()}` });
  const documents = { generateAfterPayment: async () => undefined };
  const payments = new PaymentService(db, gateway, config, documents);
  async function order() {
    const matter = await request(
      "/matters",
      user.accessToken,
      { type: "LEGAL_NOTICE" },
      201,
    );
    await db.matter.update({
      where: { id: matter.id },
      data: { status: "READY_FOR_PAYMENT" },
    });
    await db.auditLog.create({
      data: {
        actorType: "SYSTEM",
        actorId: "verification",
        action: "TEST_PAYMENT_FIXTURE_PREPARED",
        entityType: "Matter",
        entityId: matter.id,
      },
    });
    return {
      matter,
      checkout: await payments.createOrder(user.user.id, matter.id),
    };
  }
  const old = await order(),
    webhookOrder = await order();
  assert.equal(old.checkout.keyId, test.keyId);
  const original = await db.payment.findUniqueOrThrow({
    where: { providerOrderId: old.checkout.orderId },
  });
  assert.ok(original.providerCredentialId);
  await request(endpoint + "/razorpay/live", token, live);
  await request(endpoint + "/payment-mode", token, { mode: "live" });
  await runtime.refresh();
  const liveOrder = await order();
  assert.equal(liveOrder.checkout.keyId, live.keyId);
  await request(endpoint + "/razorpay/test", token, {
    keySecret: "test-api-secret-replacement-fixture",
    webhookSecret: "test-webhook-secret-replacement-fixture",
  });
  await runtime.refresh();
  // Existing checkout remains pinned despite active mode and secret rotation.
  assert.equal(
    (await payments.createOrder(user.user.id, old.matter.id)).keyId,
    test.keyId,
  );
  let usedSettings;
  gateway.fetchPayment = async (paymentId, settings) => {
    usedSettings = settings;
    return {
      id: paymentId,
      orderId: old.checkout.orderId,
      amount: 29900,
      currency: "INR",
      status: "captured",
    };
  };
  await payments.verifyCheckout(user.user.id, old.matter.id, {
    orderId: old.checkout.orderId,
    paymentId: "pay_config_fixture",
    signature: createHmac("sha256", test.keySecret)
      .update(`${old.checkout.orderId}|pay_config_fixture`)
      .digest("hex"),
  });
  assert.equal(usedSettings.credentialId, original.providerCredentialId);
  assert.equal(usedSettings.keySecret, test.keySecret);
  const payload = (orderId) =>
    Buffer.from(
      JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_${randomUUID()}`,
              order_id: orderId,
              amount: 29900,
              currency: "INR",
              status: "captured",
            },
          },
        },
      }),
    );
  const foreign = payload(liveOrder.checkout.orderId);
  await assert.rejects(
    () =>
      payments.webhook(
        foreign,
        createHmac("sha256", test.webhookSecret).update(foreign).digest("hex"),
      ),
    /credentials do not match/,
  );
  const delayed = payload(webhookOrder.checkout.orderId);
  await payments.webhook(
    delayed,
    createHmac("sha256", test.webhookSecret).update(delayed).digest("hex"),
  );
  assert.equal(
    (
      await db.payment.findUniqueOrThrow({
        where: { providerOrderId: webhookOrder.checkout.orderId },
      })
    ).status,
    "PAID",
  );
  await request(endpoint + "/gemini/model", token, {
    model: "fixture-gemini",
    fallbackModels: ["fixture-gemini-backup"],
  });
  await request(endpoint + "/gemini/keys", token, {
    label: "Primary fixture",
    apiKey: "google-primary-fixture-key-only",
    enabled: true,
    priority: 0,
  });
  await request(endpoint + "/gemini/keys", token, {
    label: "Backup fixture",
    apiKey: "google-backup-fixture-key-only",
    enabled: true,
    priority: 10,
  });
  const saved = await request(endpoint, token);
  const primary = saved.gemini.keys.find(
    (key) => key.label === "Primary fixture",
  );
  await request(endpoint + `/gemini/keys/${primary.id}`, token, {
    label: primary.label,
    enabled: false,
    priority: 0,
  });
  await runtime.refresh();
  assert.equal(runtime.gemini().keys.length, 1);
  assert.equal(
    runtime.gemini().keys[0].apiKey,
    "google-backup-fixture-key-only",
  );
  assert.equal(runtime.gemini().model, "fixture-gemini");
  const summary = await request(endpoint, token);
  const serialized = JSON.stringify(summary);
  for (const secret of [
    test.keyId,
    test.keySecret,
    test.webhookSecret,
    live.keySecret,
    "google-primary-fixture-key-only",
    "google-backup-fixture-key-only",
    "ciphertext",
  ])
    assert.ok(
      !serialized.includes(secret),
      "Secret must not appear in configuration responses",
    );
  const stored = await db.providerCredential.findMany();
  assert.ok(stored.some((row) => row.retired));
  for (const row of stored)
    assert.ok(
      row.ciphertext.startsWith("v1:") && !row.ciphertext.includes("fixture"),
      "Stored credentials must be encrypted",
    );
  assert.ok(summary.audit.some((row) => row.action === "GEMINI_KEY_UPDATED"));
  const audit = JSON.stringify(
    await db.auditLog.findMany({
      where: { entityType: "ProviderConfiguration" },
    }),
  );
  assert.ok(
    !audit.includes(test.keySecret) &&
      !audit.includes("google-backup-fixture-key-only"),
  );
  await runtime.onModuleDestroy();
  runtime = new ProviderConfigurationService(db, config);
  await runtime.onModuleInit();
  assert.equal(runtime.razorpay().keyId, live.keyId);
  assert.equal(
    runtime.gemini().keys[0].apiKey,
    "google-backup-fixture-key-only",
  );
  // Each raw provider output must share the parent run's ownership/deletion lifecycle.
  const parent = await db.aiRun.create({
    data: {
      matterId: old.matter.id,
      taskType: "NOTICE_GENERATION",
      provider: "gemini",
      modelName: "fixture",
      promptVersion: "fixture-v1",
      inputReference: "fixture-source",
      expiresAt: new Date(Date.now() + 120000),
    },
  });
  const child = await runtime.beginAttempt(
    "fixture",
    "fixture-key-id",
    "sha256:fixture",
    parent.id,
  );
  assert.equal(child.matterId, old.matter.id);
  assert.equal(child.parentRunId, parent.id);
  await runtime.finishAttempt(
    child.id,
    { text: "Private fixture legal facts" },
    Date.now(),
  );
  await assert.rejects(
    () => runtime.beginAttempt("fixture", "fixture-key-id", "fixture"),
    /AI_CONTEXT_REQUIRED/,
  );
  const accounts = new AccountService(db, { remove: async () => undefined });
  await accounts.deleteAccount(user.user.id);
  assert.equal(
    await db.aiRun.count({ where: { id: { in: [parent.id, child.id] } } }),
    0,
    "Account deletion must erase the parent and raw provider output",
  );
  await assert.rejects(
    () =>
      runtime.beginAttempt("fixture", "fixture-key-id", "fixture", parent.id),
    /AI_CONTEXT_UNAVAILABLE/,
  );
  console.log(
    "PASS: provider attempts inherit matter ownership, require a live parent context, and are erased with the account.",
  );
  console.log(
    "PASS: admin-only provider configuration, encrypted secrets, masked responses, live/test switch, pinned orders, archived webhook verification, Gemini key priority/disable, audit and restart persistence.",
  );
} finally {
  runtime?.onModuleDestroy();
  await db.$disconnect();
}
