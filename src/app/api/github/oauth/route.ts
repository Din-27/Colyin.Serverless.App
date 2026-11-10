import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublicRedirectUrl } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTarget = url.searchParams.get("redirect") || "/projects";

  // Check env or database for GitHub OAuth Client ID
  let clientId = (process.env.GITHUB_CLIENT_ID || "").trim();
  if (!clientId) {
    const setting = await db.systemSetting.findUnique({
      where: { key: "GITHUB_CLIENT_ID" },
    });
    clientId = (setting?.value || "").trim();
  }

  if (!clientId) {
    const redirectUrl = getPublicRedirectUrl(redirectTarget, req);
    redirectUrl.searchParams.set("error", "github_oauth_not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("scope", "repo,read:user");
  githubAuthUrl.searchParams.set("state", redirectTarget);

  return NextResponse.redirect(githubAuthUrl.toString());
}
