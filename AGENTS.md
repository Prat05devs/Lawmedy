This project is "Lawmedy" — a platform where a user describes a legal
problem (or asks for an RTI application), an AI drafts the document, and a
human advocate reviews and approves it before the user receives it.

Core concept: everything is a "Matter". A Matter has a type (LEGAL_NOTICE or
RTI), moves through a status pipeline (draft -> intake -> AI processing ->
advocate review -> completed), and accumulates: the user's original
statement, structured "facts", uploaded evidence, AI-generated drafts
(versioned), advocate edits/comments, a payment record, and a final document.

Tech stack:
- Monorepo using pnpm workspaces + Turborepo
- apps/web: Next.js (App Router) + TypeScript + Tailwind CSS. Contains
  routes for the end user AND role-gated routes for advocates (/advocate/...)
  and admins (/admin/...). We will split these into separate apps later —
  do not do that yet.
- apps/api: NestJS + TypeScript backend, all business logic lives here. The
  web app never talks to the database or to Gemini directly — always through
  this API.
- PostgreSQL as the database, accessed via Prisma ORM.
- Google Gemini API for AI tasks (text + multimodal). All Gemini calls
  happen server-side in apps/api and every call is logged to an `ai_runs`
  table (model, task type, prompt version, input reference, output, token
  usage, status) — never call Gemini and throw the result away.
- Never fabricate legal content: the AI's job is to work from structured
  facts the user/evidence provided, not to invent facts, dates, amounts, or
  legal citations.

Conventions:
- Prices, the AI provider/model, and whether advocate review is required are
  configuration/database values, not hardcoded constants.
- Every uploaded file is private (no public URLs) and access-controlled.
- Every state-changing action by a user, advocate, or admin should be
  logged to an `audit_logs` table.
- Build one phase at a time, exactly as scoped in the task given to you.
  Do not build ahead into future phases even if it seems convenient.
- Use `.env` for secrets, commit only `.env.example` with placeholder values.
- Write basic tests for backend business logic where practical.

