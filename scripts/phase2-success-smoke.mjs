import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prismaClient from "../apps/api/node_modules/@prisma/client/default.js";

const { PrismaClient } = prismaClient;

const origin = process.env.API_URL || "http://127.0.0.1:4000";
const db = new PrismaClient();
const suffix = randomUUID();
const password = `Test-${randomUUID()}`;

async function request(path, { token, body, status = 200 } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET",
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

try {
  const owner = await request("/auth/signup", {
    body: {
      email: `phase2-success-${suffix}@example.com`,
      password,
      fullName: "Phase Two Success",
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
        "I lent someone ₹50,000 in March and they have not paid me back.",
    },
    status: 201,
  });

  // Replace the expected failed/no-key attempt with a known-good, grounded
  // fixture to exercise the API's successful read and answer persistence path.
  const run = await db.aiRun.create({
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
  const analysis = await db.matterAiAnalysis.create({
    data: {
      matterId: matter.id,
      statementId: statement.id,
      aiRunId: run.id,
      category: "MONEY_RECOVERY",
      summary: "The user reports money lent in March has not been repaid.",
      facts: [
        {
          key: "amount",
          value: "₹50,000",
          sourceQuote: "I lent someone ₹50,000 in March",
        },
      ],
      missingInformation: [
        {
          field: "RECIPIENT_NAME",
          question: "Who did you lend the money to?",
        },
        {
          field: "EVENT_DATE",
          question: "In which year did you lend the money?",
        },
      ],
      questions: {
        create: [
          {
            matterId: matter.id,
            position: 0,
            questionType: "RECIPIENT_NAME",
            question: "Who did you lend the money to?",
          },
          {
            matterId: matter.id,
            position: 1,
            questionType: "EVENT_DATE",
            question: "In which year did you lend the money?",
          },
        ],
      },
    },
    include: { questions: true },
  });

  const intake = await request(`/matters/${matter.id}/intake`, {
    token: owner.accessToken,
  });
  assert.equal(intake.status, "SUCCEEDED");
  assert.equal(intake.analysis.questions.length, 2);
  const saved = await request(`/matters/${matter.id}/answers`, {
    token: owner.accessToken,
    body: {
      analysisId: analysis.id,
      answers: analysis.questions.map((question, index) => ({
        questionId: question.id,
        answer: index === 0 ? "A test recipient" : "2026",
      })),
    },
  });
  assert.equal(saved.allAnswered, true);
  assert.deepEqual(
    saved.analysis.questions.map((question) => question.answer.answer),
    ["A test recipient", "2026"],
  );

  const other = await request("/auth/signup", {
    body: {
      email: `phase2-other-${suffix}@example.com`,
      password,
      fullName: "Phase Two Other",
    },
    status: 201,
  });
  await request(`/matters/${matter.id}/intake`, {
    token: other.accessToken,
    status: 404,
  });
  await request(`/matters/${matter.id}/answers`, {
    token: other.accessToken,
    body: {
      analysisId: analysis.id,
      answers: analysis.questions.map((question) => ({
        questionId: question.id,
        answer: "Unauthorized",
      })),
    },
    status: 404,
  });
  console.log(
    "PASS: successful intake rendering, answer persistence, and cross-user intake isolation.",
  );
} finally {
  await db.$disconnect();
}
