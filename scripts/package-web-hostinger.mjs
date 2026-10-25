// Package the built Next.js standalone server. No source secrets or .env files.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const web = path.join(root, "apps/web");
const source = path.join(web, ".next/standalone");
if (!existsSync(path.join(source, "apps/web/server.js"))) throw new Error("Run pnpm --filter @lawmedy/web build first.");
const staging = mkdtempSync(path.join(tmpdir(), "lawmedy-web-package-"));
try {
  const safe = (file) => !/^\.env(?:\.|$)/.test(path.basename(file));
  cpSync(source, staging, { recursive: true, dereference: true, filter: safe });
  cpSync(path.join(web, "public"), path.join(staging, "apps/web/public"), { recursive: true });
  cpSync(path.join(web, ".next/static"), path.join(staging, "apps/web/.next/static"), { recursive: true });
  // Hostinger installs this manifest; all required runtime packages are already bundled.
  writeFileSync(path.join(staging, "package.json"), JSON.stringify({ name: "lawmedy-web", private: true,
    scripts: { start: "node apps/web/server.js", build: "node -e \"console.log('Prebuilt Next.js server ready')\"" }, engines: { node: ">=22" } }, null, 2));
  const files = {};
  function walk(directory) {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      if (!safe(file)) continue;
      if (statSync(file).isDirectory()) walk(file);
      else files[path.relative(staging, file).split(path.sep).join("/")] = readFileSync(file);
    }
  }
  walk(staging);
  const { zipSync } = createRequire(path.join(root, "apps/api/package.json"))("fflate");
  mkdirSync(path.join(root, ".local"), { recursive: true });
  writeFileSync(path.join(root, ".local/lawmedy-web-hostinger.zip"), zipSync(files, { level: 6 }));
  console.log(`Created .local/lawmedy-web-hostinger.zip (${Object.keys(files).length} files, no .env files).`);
} finally { rmSync(staging, { recursive: true, force: true }); }
