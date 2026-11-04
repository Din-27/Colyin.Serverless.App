import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;
    const body = await req.json();
    const { enable } = body;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    let publicPort: number | null = null;
    if (enable) {
      // Allocate an unallocated high port between 10000 and 20000
      publicPort = Math.floor(10000 + Math.random() * 9000);
    }

    const updated = await db.addon.update({
      where: { id: addonId },
      data: { publicPort },
    });

    return NextResponse.json({
      success: true,
      addon: updated,
      message: enable
        ? `Public access enabled on port ${publicPort}`
        : "Public access disabled",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
