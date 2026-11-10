import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, saveMasterCredentialsFile } from "@/lib/auth";

export async function GET() {
  try {
    const userCount = await db.user.count();

    // If any user exists, initial setup is permanently complete!
    if (userCount > 0) {
      await db.systemSetting
        .upsert({
          where: { key: "INITIAL_SETUP_COMPLETED" },
          update: { value: "true" },
          create: { key: "INITIAL_SETUP_COMPLETED", value: "true" },
        })
        .catch(() => {});

      return NextResponse.json({ isConfigured: true });
    }

    // Generate smart defaults for the user
    const encryptionMasterKey = crypto.randomBytes(32).toString("hex");
    const authSecret = crypto.randomBytes(32).toString("hex");
    const webhookSecret = crypto.randomBytes(24).toString("hex");
    const generatedPassword = `Colyin-${crypto.randomBytes(6).toString("hex")}-${crypto.randomBytes(4).toString("hex")}`;
    const detectedIp = process.env.PUBLIC_IP || "127.0.0.1";
    const wildcardDomain = process.env.WILDCARD_DOMAIN || `${detectedIp}.sslip.io`;

    return NextResponse.json({
      isConfigured: false,
      defaults: {
        publicIp: detectedIp,
        wildcardDomain,
        encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || encryptionMasterKey,
        authSecret: process.env.AUTH_SECRET || authSecret,
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || webhookSecret,
        adminEmail: "admin@colyin.local",
        adminName: "Master Administrator",
        adminPassword: generatedPassword,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { isConfigured: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      publicIp = "127.0.0.1",
      wildcardDomain = "127.0.0.1.sslip.io",
      encryptionMasterKey,
      authSecret,
      webhookSecret,
      adminEmail = "admin@colyin.local",
      adminName = "Master Administrator",
      adminPassword,
    } = body;

    if (!encryptionMasterKey || !authSecret || !adminPassword || !adminEmail) {
      return NextResponse.json(
        { success: false, error: "All configuration fields and admin credentials are required." },
        { status: 400 }
      );
    }

    // 1. Update or generate .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const setEnvVar = (key: string, val: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${val}"`);
      } else {
        envContent += `\n${key}="${val}"`;
      }
    };

    setEnvVar("NODE_ENV", process.env.NODE_ENV || "production");
    setEnvVar("PUBLIC_IP", publicIp.trim());
    setEnvVar("WILDCARD_DOMAIN", wildcardDomain.trim());
    setEnvVar("ENCRYPTION_MASTER_KEY", encryptionMasterKey.trim());
    setEnvVar("AUTH_SECRET", authSecret.trim());
    if (webhookSecret) {
      setEnvVar("GITHUB_WEBHOOK_SECRET", webhookSecret.trim());
    }
    if (!envContent.includes("DATABASE_URL=")) {
      envContent += `\nDATABASE_URL="file:./data/prod.db"`;
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");

    // Also populate runtime process.env
    process.env.PUBLIC_IP = publicIp.trim();
    process.env.WILDCARD_DOMAIN = wildcardDomain.trim();
    process.env.ENCRYPTION_MASTER_KEY = encryptionMasterKey.trim();
    process.env.AUTH_SECRET = authSecret.trim();
    if (webhookSecret) {
      process.env.GITHUB_WEBHOOK_SECRET = webhookSecret.trim();
    }

    // 2. Create or update Administrator user
    const { hash, salt } = hashPassword(adminPassword);
    let adminUser = await db.user.findUnique({
      where: { email: adminEmail.trim().toLowerCase() },
    });

    if (adminUser) {
      adminUser = await db.user.update({
        where: { id: adminUser.id },
        data: {
          name: adminName.trim(),
          password: hash,
          salt,
          role: "ADMIN",
        },
      });
    } else {
      adminUser = await db.user.create({
        data: {
          email: adminEmail.trim().toLowerCase(),
          name: adminName.trim(),
          password: hash,
          salt,
          role: "ADMIN",
        },
      });
    }

    // 3. Mark setup as completed in DB
    await db.systemSetting.upsert({
      where: { key: "INITIAL_SETUP_COMPLETED" },
      update: { value: "true" },
      create: { key: "INITIAL_SETUP_COMPLETED", value: "true" },
    });

    await db.systemSetting.upsert({
      where: { key: "WILDCARD_DOMAIN" },
      update: { value: wildcardDomain.trim() },
      create: { key: "WILDCARD_DOMAIN", value: wildcardDomain.trim() },
    });

    // 4. Save credentials to colyin-credentials.txt
    saveMasterCredentialsFile(adminEmail.trim().toLowerCase(), adminPassword);

    // 5. Generate session token and set cookie
    const token = createSessionToken(adminUser);
    const cookieStore = await cookies();
    cookieStore.set("paas_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully! Redirecting to Dashboard...",
      redirectUrl: "/",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

