import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/engine/crypto";

export async function GET() {
  try {
    const account = await db.githubAccount.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!account) {
      return NextResponse.json({
        success: true,
        connected: false,
        account: null,
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        id: account.id,
        username: account.username,
        avatarUrl: account.avatarUrl,
        updatedAt: account.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, username: customUsername } = body;

    let username = customUsername || "github-developer";
    let avatarUrl = "https://github.com/github.png";
    const rawToken = token || "gho_sample_token_minipaas_developer";

    // If real token provided, fetch actual user profile from GitHub API
    if (token && token.startsWith("gh")) {
      try {
        const ghRes = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "MiniPaaS-Engine",
          },
        });
        if (ghRes.ok) {
          const ghUser = await ghRes.json();
          username = ghUser.login || username;
          avatarUrl = ghUser.avatar_url || avatarUrl;
        }
      } catch (err) {
        console.warn("Could not fetch user profile from GitHub API:", err);
      }
    }

    const encrypted = encryptSecret(rawToken);

    // Save or update account in DB
    const account = await db.githubAccount.upsert({
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

    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        id: account.id,
        username: account.username,
        avatarUrl: account.avatarUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.githubAccount.deleteMany();
    return NextResponse.json({ success: true, message: "GitHub account disconnected" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
