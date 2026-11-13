import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { executeDockerPrune } from "@/lib/engine/dockerPrune";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot trigger Docker system cleanup" },
        { status: 403 }
      );
    }

    const result = await executeDockerPrune();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to prune Docker resources", result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Docker builder and system cache successfully pruned",
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to trigger Docker prune" },
      { status: 500 }
    );
  }
}

