import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined)
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const email = (process.env.ADVOCATE_EMAIL || "").trim().toLowerCase();
const password = process.env.ADVOCATE_PASSWORD || "";
const fullName = (process.env.ADVOCATE_FULL_NAME || "Lawmedy Advocate").trim();
if (!email || !email.includes("@") || !password || password.startsWith("replace-") || password.length < 12)
  throw new Error("Set ADVOCATE_EMAIL and ADVOCATE_PASSWORD (at least 12 characters) in apps/api/.env before seeding.");

const db = new PrismaClient();
const authorities = [
  {
    name: "Department of Personnel and Training",
    department: "Department of Personnel and Training",
    governmentLevel: "CENTRAL",
    state: null,
    address: "North Block, New Delhi - 110001",
    rtiPortalUrl: "https://rtionline.gov.in/",
  },
  {
    name: "Railway Board",
    department: "Ministry of Railways",
    governmentLevel: "CENTRAL",
    state: null,
    address: "Rail Bhawan, Raisina Road, New Delhi - 110001",
    rtiPortalUrl: "https://rtionline.gov.in/",
  },
  {
    name: "General Administration Department, Maharashtra",
    department: "General Administration Department",
    governmentLevel: "STATE",
    state: "Maharashtra",
    address: "Mantralaya, Madam Cama Road, Mumbai - 400032",
    rtiPortalUrl: "https://rtionline.maharashtra.gov.in/",
  },
];
for (const authority of authorities)
  await db.publicAuthority.upsert({
    where: { name: authority.name },
    create: authority,
    update: authority,
  });
for (const configuration of [
  { matterType: "LEGAL_NOTICE", category: "*", requiresAdvocateReview: true },
  { matterType: "RTI", category: "*", requiresAdvocateReview: false },
])
  await db.matterWorkflowConfiguration.upsert({
    where: {
      matterType_category: {
        matterType: configuration.matterType,
        category: configuration.category,
      },
    },
    create: configuration,
    update: { requiresAdvocateReview: configuration.requiresAdvocateReview },
  });
const passwordHash = await bcrypt.hash(password, 12);
const user = await db.user.upsert({
  where: { email },
  create: { email, fullName, passwordHash, role: "ADVOCATE" },
  update: { fullName, passwordHash, role: "ADVOCATE" },
  select: { id: true, email: true, fullName: true, role: true },
});
console.log(`Seeded advocate ${user.email}`);
console.log(`Seeded ${authorities.length} public authorities and workflow defaults`);

// Optional admin account (full dashboard access): set ADMIN_EMAIL and ADMIN_PASSWORD.
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "";
if (adminEmail && adminPassword) {
  if (!adminEmail.includes("@") || adminPassword.length < 12 || adminPassword.startsWith("replace-"))
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", active: true, passwordHash: await bcrypt.hash(adminPassword, 12) },
    create: { email: adminEmail, fullName: (process.env.ADMIN_FULL_NAME || "Lawmedy Admin").trim(), role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12) },
  });
  console.log(`Seeded admin ${admin.email}`);
}
await db.$disconnect();
