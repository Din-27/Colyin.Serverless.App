import { NextResponse } from "next/server";
import { getDockerDaemonStatus } from "@/lib/engine/docker";

export async function GET() {
  try {
    const status = await getDockerDaemonStatus();
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: { online: false, error: err.message } },
      { status: 500 }
    );
  }
}
