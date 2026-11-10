import { NextResponse } from "next/server";
import { dismissInitialMasterCredentials } from "@/lib/auth";

export async function POST() {
  try {
    await dismissInitialMasterCredentials();
    return NextResponse.json({ success: true, message: "Credentials dismissed" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
