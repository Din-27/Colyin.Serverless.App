import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const domains = await db.domain.findMany({
      where: { applicationId: appId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, domains });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot add domains" },
        { status: 403 }
      );
    }

    const { id: appId } = await params;
    const body = await req.json().catch(() => ({}));
    let host = (body.host || "").toLowerCase().trim();

    // Strip http:// or https:// if user pasted a URL, including path and port
    host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");

    if (!host || !host.includes(".")) {
      return NextResponse.json(
        { success: false, error: "Valid domain name is required (e.g., api.mydomain.com)" },
        { status: 400 }
      );
    }

    // Check if domain is already in use
    const existing = await db.domain.findUnique({
      where: { host },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Domain '${host}' is already attached to an application` },
        { status: 409 }
      );
    }

    const domainCount = await db.domain.count({
      where: { applicationId: appId },
    });

    const isPrimary = domainCount === 0 || !!body.isPrimary;

    // If setting as primary, unset existing primary
    if (isPrimary) {
      await db.domain.updateMany({
        where: { applicationId: appId },
        data: { isPrimary: false },
      });
    }

    const domain = await db.domain.create({
      data: {
        applicationId: appId,
        host,
        isPrimary,
        sslEnabled: body.sslEnabled !== false,
        certificateStatus: "PENDING",
      },
    });

    return NextResponse.json({ success: true, domain }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
