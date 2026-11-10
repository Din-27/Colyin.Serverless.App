import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  res.cookies.set("paas_session", "", {
    ...getSessionCookieOptions(req),
    maxAge: 0,
  });
  return res;
}
