import { NextResponse } from "next/server";
import { getSessionUser, ensureDefaultAdmin, getInitialMasterCredentials } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const userCount = await db.user.count();
    const needsSetup = userCount === 0;

    const session = await getSessionUser();
    const initialMasterCredentials = await getInitialMasterCredentials();
    const isProduction = process.env.NODE_ENV === "production";

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        needsSetup,
        user: null,
        userCount,
        isProduction,
        initialMasterCredentials,
      });
    }

    const dbUser = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        userCount,
        isProduction,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: dbUser,
      userCount,
      isProduction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
