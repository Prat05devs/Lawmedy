import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const origin = process.env.API_URL || "http://127.0.0.1:4000";
const suffix = randomUUID();
const password = `Test-${randomUUID()}`;
async function request(path, { token, body, status = 200, method } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${path}: expected ${status}, got ${response.status}: ${JSON.stringify(data)}`,
  );
  return data;
}
await request("/matters", { status: 401 });
const email = `smoke-${suffix}@example.com`;
const owner = await request("/auth/signup", {
  body: { email, password, fullName: "Smoke Owner" },
  status: 201,
});
assert.ok(!("passwordHash" in owner.user));
await request("/auth/signup", {
  body: { email, password, fullName: "Duplicate" },
  status: 409,
});
await request("/auth/login", {
  body: { email, password: "incorrect-password" },
  status: 401,
});
const login = await request("/auth/login", {
  body: { email: email.toUpperCase(), password },
});
const token = login.accessToken;
assert.equal((await request("/users/me", { token })).id, owner.user.id);
await request("/matters", { token, body: { type: "INVALID" }, status: 400 });
const matter = await request("/matters", {
  token,
  body: { type: "LEGAL_NOTICE" },
  status: 201,
});
assert.match(matter.referenceNumber, /^MAT-\d{4}-\d{6,}$/);
assert.equal(matter.status, "DRAFT");
await request(`/matters/${matter.id}/statement`, {
  token,
  body: { statement: "   " },
  status: 400,
});
const statement =
  "I lent someone ₹50,000 in March. They have not paid me back.";
await request(`/matters/${matter.id}/statement`, {
  token,
  body: { statement },
  status: 201,
});
const intake = await request(`/matters/${matter.id}/intake`, { token });
assert.ok(
  ["SUCCEEDED", "FAILED"].includes(intake.status),
  `unexpected intake status: ${intake.status}`,
);
if (intake.status === "SUCCEEDED") {
  assert.ok(intake.analysis.summary.length > 0);
  assert.ok(
    intake.analysis.questions.length >= 2 &&
      intake.analysis.questions.length <= 5,
  );
  const answered = await request(`/matters/${matter.id}/answers`, {
    token,
    body: {
      analysisId: intake.analysis.id,
      answers: intake.analysis.questions.map((question, index) => ({
        questionId: question.id,
        answer: `Smoke-test answer ${index + 1}`,
      })),
    },
  });
  assert.equal(answered.allAnswered, true);
  assert.ok(answered.analysis.questions.every((question) => question.answer));
} else {
  assert.match(intake.message, /could not analyse/i);
  const retry = await request(`/matters/${matter.id}/intake/retry`, {
    token,
    method: "POST",
  });
  assert.equal(retry.status, "FAILED");
}
const saved = await request(`/matters/${matter.id}`, { token });
assert.equal(saved.status, "INTAKE_IN_PROGRESS");
assert.equal(saved.statements[0].statement, statement);
assert.ok(
  (await request("/matters", { token })).some((m) => m.id === matter.id),
);
const other = await request("/auth/signup", {
  body: {
    email: `other-${suffix}@example.com`,
    password,
    fullName: "Smoke Other",
  },
  status: 201,
});
await request(`/matters/${matter.id}`, {
  token: other.accessToken,
  status: 404,
});
await request(`/matters/${matter.id}/statement`, {
  token: other.accessToken,
  body: { statement: "Unauthorized edit" },
  status: 404,
});
assert.equal(
  (await request("/matters", { token: other.accessToken })).length,
  0,
);
console.log(
  `PASS: auth, persistence, ownership, and Phase 2 ${intake.status === "SUCCEEDED" ? "analysis/answers" : "failure/retry"} flow.`,
);
