// Packages apps/api as a standalone Node.js project for Hostinger's "Node.js Web App" upload.
// Hostinger builds one app with npm, but this repo is a pnpm monorepo, so the API is copied out
// on its own with an npm lockfile. Secrets (.env), local files (.local) and build output are left out.
//
// Usage: node scripts/package-api-hostinger.mjs   ->  .local/lawmedy-api-hostinger.zip
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = path.join(root, "apps", "api");
const include = ["package.json", "nest-cli.json", "tsconfig.json", "src", "prisma", "assets"];
const output = path.join(root, ".local", "lawmedy-api-hostinger.zip");

const staging = mkdtempSync(path.join(tmpdir(), "lawmedy-api-"));
try {
  for (const entry of include)
    cpSync(path.join(api, entry), path.join(staging, entry), {
      recursive: true,
      filter: (source) => !source.endsWith(".spec.ts"),
    });

  // Pin the versions this repo is tested with, so Hostinger's npm install matches pnpm's.
  const lock = readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
  const pkg = JSON.parse(readFileSync(path.join(staging, "package.json"), "utf8"));
  const section = lock.slice(lock.indexOf("\n  apps/api:"), lock.indexOf("\n  apps/", lock.indexOf("\n  apps/api:") + 1));
  for (const field of ["dependencies", "devDependencies"])
    for (const name of Object.keys(pkg[field] ?? {})) {
      const match = section.match(new RegExp(`\\n {6}'?${name.replace(/[/.]/g, "\\$&")}'?:\\n {8}specifier: [^\\n]+\\n {8}version: ([^\\s(]+)`));
      if (match) pkg[field][name] = match[1];
    }
  // npm does not read pnpm.overrides; carry the audited transitive fixes into
  // the independently installed Hostinger package as well.
  const monorepo = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  pkg.overrides = {};
  for (const [selector, version] of Object.entries(monorepo.pnpm?.overrides ?? {})) {
    const [parent, child] = selector.split(">");
    if (child) { pkg.overrides[parent] ??= {}; pkg.overrides[parent][child] = version; }
    else pkg.overrides[parent] = version;
  }
  pkg.engines = { node: ">=22" };
  writeFileSync(path.join(staging, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: staging,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const { zipSync } = createRequire(path.join(api, "package.json"))("fflate");
  const files = {};
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const full = path.join(directory, name);
      if (statSync(full).isDirectory()) walk(full);
      else files[path.relative(staging, full).split(path.sep).join("/")] = readFileSync(full);
    }
  };
  walk(staging);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, zipSync(files, { level: 9 }));
  console.log(`\nCreated ${path.relative(root, output)} (${Object.keys(files).length} files).`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
