import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import dns from "dns/promises";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  try {
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

    let aRecords: string[] = [];
    let cnameRecords: string[] = [];
    let resolved = false;

    try {
      aRecords = await dns.resolve4(domain.host);
      resolved = aRecords.length > 0;
    } catch {
      // If A record lookup fails, try CNAME
      try {
        cnameRecords = await dns.resolveCname(domain.host);
        resolved = cnameRecords.length > 0;
      } catch {}
    }

    const updated = await db.domain.update({
      where: { id: domainId },
      data: {
        certificateStatus: resolved ? "ISSUED" : "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      domain: updated,
      resolved,
      records: {
        a: aRecords,
        cname: cnameRecords,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
