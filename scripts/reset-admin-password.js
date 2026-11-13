#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function generatePassword() {
  const p1 = crypto.randomBytes(6).toString("hex");
  const p2 = crypto.randomBytes(4).toString("hex");
  return `Colyin-${p1}-${p2}`;
}

async function main() {
  const targetPassword = process.argv[2] || generatePassword();

  // Find admin user or create one
  let admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  const { hash, salt } = hashPassword(targetPassword);

  if (!admin) {
    const email = (process.env.ADMIN_EMAIL || "admin@colyin.local").toLowerCase().trim();
    admin = await prisma.user.create({
      data: {
        email,
        name: "Master Administrator",
        password: hash,
        salt,
        role: "ADMIN",
      },
    });
    console.log(`[Created] Master Administrator account created: ${admin.email}`);
  } else {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hash,
        salt,
      },
    });
    console.log(`[Updated] Password successfully updated for Admin: ${admin.email}`);
  }

  // Update colyin-credentials.txt in both root and persistent data directory
  const credPath = path.join(process.cwd(), "colyin-credentials.txt");
  const dataDir = path.join(process.cwd(), "data");
  const dataCredPath = path.join(dataDir, "colyin-credentials.txt");

  const content = `================================================================================
COLYIN - MASTER ADMIN CREDENTIALS
Updated at: ${new Date().toISOString()}
================================================================================

Email    : ${admin.email}
Password : ${targetPassword}
Role     : ADMIN (Full Cluster Authority)

Web Console: http://localhost:3050/login
================================================================================
`;
  try {
    fs.writeFileSync(credPath, content, { encoding: "utf-8" });
    if (fs.existsSync(dataDir)) {
      fs.writeFileSync(dataCredPath, content, { encoding: "utf-8" });
    }
  } catch (err) {
    console.warn("Could not write colyin-credentials.txt:", err.message);
  }

  console.log("\n========================================================");
  console.log("  COLYIN MASTER ADMIN CREDENTIALS");
  console.log("========================================================");
  console.log(`  Email    : ${admin.email}`);
  console.log(`  Password : ${targetPassword}`);
  console.log(`  Saved to : ${credPath}`);
  console.log("========================================================\n");
}

main()
  .catch((err) => {
    console.error("Error resetting admin password:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
