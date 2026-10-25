// Source/package hygiene only; complements, rather than replaces, live security tests.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root }).toString().split("\0").filter(Boolean);
const findings = [];
const patterns = [
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk_live_|sk-proj-|ghp_|github_pat_)[0-9A-Za-z_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
];
let scanned = 0;
for (const name of files) {
  if (/(?:^|\/)\.env(?:\.|$)/.test(name) && !name.endsWith(".env.example")) findings.push({ file: name, issue: "non-example environment file" });
  const file = path.join(root, name);
  if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size > 2 * 1024 * 1024) continue;
  const data = readFileSync(file);
  if (data.includes(0)) continue;
  scanned++;
  data.toString().split("\n").forEach((line, i) => {
    if (patterns.some((pattern) => pattern.test(line))) findings.push({ file: name, line: i + 1, issue: "possible credential; value withheld" });
  });
}
console.log(JSON.stringify({ scannedSourceFiles: scanned, findings }, null, 2));
assert.equal(findings.length, 0, "Review credential findings before shipping");
const runtime = process.argv[2];
if (runtime) {
  const packages = readdirSync(path.join(root, runtime, "node_modules/.pnpm"));
  const forbidden = packages.filter((name) => /^(node-forge|braces|sprintf-js|jest|expo)@/.test(name));
  console.log(JSON.stringify({ runtimePackage: runtime, forbiddenDevelopmentPackages: forbidden }, null, 2));
  assert.equal(forbidden.length, 0, "Development advisory paths must not be shipped in the API runtime");
  for (const entry of readdirSync(path.join(root, runtime))) assert.ok(!/^\.env(?:\.|$)/.test(entry), "Runtime contains environment secrets");
}
