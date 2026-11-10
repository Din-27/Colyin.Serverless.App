import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot delete domains" },
        { status: 403 }
      );
    }

    const { id: appId, domainId } = await params;

    const domain = await db.domain.findFirst({
      where: { id: domainId, applicationId: appId },
    });

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain not found" },
        { status: 404 }
      );
    }

    await db.domain.delete({
      where: { id: domainId },
    });

    // If deleted domain was primary, promote another domain to primary if exists
    if (domain.isPrimary) {
      const nextDomain = await db.domain.findFirst({
        where: { applicationId: appId },
        orderBy: { createdAt: "asc" },
      });
      if (nextDomain) {
        await db.domain.update({
          where: { id: nextDomain.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Domain deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot modify domains" },
        { status: 403 }
      );
    }

    const { id: appId, domainId } = await params;
    const body = await req.json().catch(() => ({}));

    const domain = await db.domain.findFirst({
      where: { id: domainId, applicationId: appId },
    });

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};

    if (body.sslEnabled !== undefined) {
      dataToUpdate.sslEnabled = !!body.sslEnabled;
    }

    if (body.isPrimary === true) {
      await db.domain.updateMany({
        where: { applicationId: appId },
        data: { isPrimary: false },
      });
      dataToUpdate.isPrimary = true;
    }

    const updated = await db.domain.update({
      where: { id: domainId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, domain: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
