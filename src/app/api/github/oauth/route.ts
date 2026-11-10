import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTarget = url.searchParams.get("redirect") || "/projects";

  // Check env or database for GitHub OAuth Client ID
  let clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    const setting = await db.systemSetting.findUnique({
      where: { key: "GITHUB_CLIENT_ID" },
    });
    clientId = setting?.value;
  }

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`${redirectTarget}?error=github_oauth_not_configured`, req.url)
    );
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("scope", "repo,read:user");
  githubAuthUrl.searchParams.set("state", redirectTarget);

  return NextResponse.redirect(githubAuthUrl.toString());
}
