import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sanitizeDomain, DEFAULT_WILDCARD_DOMAIN } from "@/lib/engine/domains";

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Default fallbacks if not configured
    if (!settingsMap["WILDCARD_DOMAIN"]) {
      settingsMap["WILDCARD_DOMAIN"] =
        process.env.WILDCARD_DOMAIN || DEFAULT_WILDCARD_DOMAIN;
    }

    return NextResponse.json({
      success: true,
      settings: settingsMap,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot modify system settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "Setting key is required" },
        { status: 400 }
      );
    }

    let cleanVal = String(value ?? "").trim();
    if (key === "WILDCARD_DOMAIN") {
      cleanVal = sanitizeDomain(cleanVal) || DEFAULT_WILDCARD_DOMAIN;
    }

    const updated = await db.systemSetting.upsert({
      where: { key },
      update: { value: cleanVal },
      create: { key, value: cleanVal },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
