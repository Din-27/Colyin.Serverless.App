import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/engine/crypto";
import { getPublicRedirectUrl } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "/";

  if (!code) {
    const redirectUrl = getPublicRedirectUrl(state, req);
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  let clientId = (process.env.GITHUB_CLIENT_ID || "").trim();
  let clientSecret = (process.env.GITHUB_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    const idSetting = await db.systemSetting.findUnique({
      where: { key: "GITHUB_CLIENT_ID" },
    });
    const secretSetting = await db.systemSetting.findUnique({
      where: { key: "GITHUB_CLIENT_SECRET" },
    });
    clientId = (idSetting?.value || clientId).trim();
    clientSecret = (secretSetting?.value || clientSecret).trim();
  }

  if (!clientId || !clientSecret) {
    const redirectUrl = getPublicRedirectUrl(state, req);
    redirectUrl.searchParams.set("error", "oauth_credentials_missing");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      const redirectUrl = getPublicRedirectUrl(state, req);
      redirectUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Fetch verified profile from GitHub API
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "MiniPaaS-Engine",
      },
    });

    if (!userRes.ok) {
      const redirectUrl = getPublicRedirectUrl(state, req);
      redirectUrl.searchParams.set("error", "fetch_user_failed");
      return NextResponse.redirect(redirectUrl);
    }

    const ghUser = await userRes.json();
    const username = ghUser.login;
    const avatarUrl = ghUser.avatar_url;

    const encrypted = encryptSecret(accessToken);

    await db.githubAccount.upsert({
      where: { username },
      create: {
        username,
        avatarUrl,
        encryptedToken: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      update: {
        avatarUrl,
        encryptedToken: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    const redirectUrl = getPublicRedirectUrl(state, req);
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error("GitHub OAuth Callback error:", err);
    const redirectUrl = getPublicRedirectUrl(state, req);
    redirectUrl.searchParams.set("error", err.message || "oauth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
