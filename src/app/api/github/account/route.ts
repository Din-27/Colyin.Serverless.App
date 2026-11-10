import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/engine/crypto";

function getLocalGhCliAccounts(): Array<{ username: string; token: string; active: boolean }> {
  try {
    const { execSync } = require("child_process");
    const statusOutput = execSync("gh auth status", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const accounts: Array<{ username: string; token: string; active: boolean }> = [];
    const lines = statusOutput.split("\n");
    let currentAccount = "";
    let isActive = false;

    for (const line of lines) {
      const match = line.match(/Logged in to github\.com account ([^\s(]+)/);
      if (match) {
        currentAccount = match[1];
        isActive = false;
      }
      if (line.includes("Active account: true")) {
        isActive = true;
      }
      if (currentAccount && (line.includes("Token:") || line.includes("Token scopes:"))) {
        try {
          const token = execSync(`gh auth token -u "${currentAccount}"`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
          if (token && !accounts.some((a) => a.username === currentAccount)) {
            accounts.push({ username: currentAccount, token, active: isActive });
          }
        } catch {}
      }
    }

    if (accounts.length === 0) {
      try {
        const token = execSync("gh auth token", {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (token) {
          accounts.push({ username: "active-user", token, active: true });
        }
      } catch {}
    }

    return accounts;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const account = await db.githubAccount.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const cliAccounts = getLocalGhCliAccounts().map((a) => ({
      username: a.username,
      active: a.active,
    }));

    if (!account) {
      return NextResponse.json({
        success: true,
        connected: false,
        account: null,
        cliAccounts,
      });
    }

    let hasToken = false;
    try {
      const decrypted = decryptSecret(account.encryptedToken, account.iv, account.authTag);
      hasToken = !!decrypted && !decrypted.startsWith("public_user_");
    } catch {}

    return NextResponse.json({
      success: true,
      connected: true,
      account: {
        id: account.id,
        username: account.username,
        avatarUrl: account.avatarUrl,
        hasToken,
        updatedAt: account.updatedAt,
      },
      cliAccounts,
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
    let { token, username: inputUsername, useCliAccount } = body;

    let username = inputUsername?.trim();
    let avatarUrl = "https://github.com/github.png";
    let validToken = token?.trim() || "";
    let hasPrivateAccess = false;

    const localCliAccounts = getLocalGhCliAccounts();

    // Auto-detect token from local authenticated GitHub CLI if no explicit token provided
    if (!validToken) {
      if (useCliAccount) {
        const found = localCliAccounts.find(
          (a) => a.username.toLowerCase() === String(useCliAccount).toLowerCase()
        );
        if (found) {
          validToken = found.token;
          username = found.username;
        }
      } else if (username) {
        // If user typed a username that matches a local CLI account, use its authenticated token
        const found = localCliAccounts.find(
          (a) => a.username.toLowerCase() === username.toLowerCase()
        );
        if (found) {
          validToken = found.token;
        }
      } else if (localCliAccounts.length > 0) {
        // User clicked the initial connect button without inputs: auto-connect active CLI account
        const active = localCliAccounts.find((a) => a.active) || localCliAccounts[0];
        validToken = active.token;
        username = active.username;
      }
    }

    // 1. If GitHub token is available (either provided or auto-detected from CLI session), verify via GitHub API
    if (validToken) {
      const ghRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${validToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MiniPaaS-Engine",
        },
      });

      if (!ghRes.ok) {
        const errText = await ghRes.text();
        return NextResponse.json(
          {
            success: false,
            error: `GitHub token verification failed (${ghRes.status}): ${errText}`,
          },
          { status: 400 }
        );
      }

      const ghUser = await ghRes.json();
      username = ghUser.login;
      avatarUrl = ghUser.avatar_url;
      hasPrivateAccess = true;
    } else if (username) {
      // 2. Fetch real GitHub public profile without PAT (public repos only)
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "MiniPaaS-Engine",
        },
      });

      if (!ghRes.ok) {
        return NextResponse.json(
          { success: false, error: `GitHub user '${username}' not found on GitHub` },
          { status: 404 }
        );
      }

      const ghUser = await ghRes.json();
      username = ghUser.login;
      avatarUrl = ghUser.avatar_url;
      validToken = `public_user_${username}`;
      hasPrivateAccess = false;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter your GitHub token, select a local account, or enter a username.",
        },
        { status: 400 }
      );
    }

    const encrypted = encryptSecret(validToken);

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
        hasToken: hasPrivateAccess,
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
