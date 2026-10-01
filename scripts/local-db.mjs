// Optional development fallback when Docker isn't installed. Uses real PostgreSQL 17.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const local = resolve(root, ".local");
mkdirSync(local, { recursive: true });
const credentialFile = resolve(local, "postgres.json");
if (!existsSync(credentialFile))
  writeFileSync(
    credentialFile,
    JSON.stringify({ password: randomBytes(32).toString("hex") }),
    { mode: 0o600 },
  );
const { password } = JSON.parse(readFileSync(credentialFile, "utf8"));
const databaseDir = resolve(local, "postgres");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "lawmedy",
  password,
  port: 5433,
  persistent: true,
  authMethod: "scram-sha-256",
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const found = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'lawmedy'",
);
if (!found.rowCount) await pg.createDatabase("lawmedy");
await client.end();
const envPath = resolve(root, "apps/api/.env");
if (!existsSync(envPath)) {
  writeFileSync(
    envPath,
    `DATABASE_URL=postgresql://lawmedy:${password}@127.0.0.1:5433/lawmedy?schema=public\nJWT_SECRET=${randomBytes(48).toString("hex")}\nWEB_ORIGIN=http://localhost:3000\nPORT=4000\n`,
    { mode: 0o600 },
  );
  console.log("Created apps/api/.env with local development credentials.");
} else
  console.log(
    "Existing apps/api/.env preserved. This database listens on port 5433; credentials are in .local/postgres.json.",
  );
console.log(
  "PostgreSQL ready on 127.0.0.1:5433. Keep this terminal open; Ctrl+C stops it and preserves data.",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
