import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/engine/crypto";

export async function GET() {
  try {
    const account = await db.githubAccount.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "No GitHub account connected", connected: false },
        { status: 401 }
      );
    }

    let token = "";
    try {
      token = decryptSecret(account.encryptedToken, account.iv, account.authTag);
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: `Failed to decrypt token: ${e.message}` },
        { status: 500 }
      );
    }

    const hasToken = !!token && !token.startsWith("public_user_");
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "MiniPaaS-Engine",
    };

    if (hasToken) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let rawRepos: any[] = [];
    const maxPages = 3; // Fetch up to 300 repositories to ensure all private & public repos are captured

    for (let page = 1; page <= maxPages; page++) {
      let apiUrl = "";
      if (hasToken) {
        // Authenticated user: fetch all repositories (public, private, internal, organization member)
        apiUrl = `https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&page=${page}&sort=updated`;
      } else {
        // Public user without token: fetch public repositories of the user
        apiUrl = `https://api.github.com/users/${encodeURIComponent(account.username)}/repos?per_page=100&page=${page}&sort=updated`;
      }

      const ghRes = await fetch(apiUrl, { headers });

      if (!ghRes.ok) {
        // If first page fails, return error
        if (page === 1) {
          const errText = await ghRes.text();
          return NextResponse.json(
            {
              success: false,
              error: `GitHub API error (${ghRes.status}): ${errText}`,
              repos: [],
              hasToken,
            },
            { status: ghRes.status }
          );
        }
        break;
      }

      const pageData = await ghRes.json();
      if (!Array.isArray(pageData) || pageData.length === 0) {
        break;
      }

      rawRepos = rawRepos.concat(pageData);
      if (pageData.length < 100) {
        break; // Reached end of repositories
      }
    }

    const repos = rawRepos.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      cloneUrl: r.clone_url,
      defaultBranch: r.default_branch || "main",
      isPrivate: !!r.private,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count || 0,
      updatedAt: r.updated_at,
    }));

    const privateCount = repos.filter((r) => r.isPrivate).length;
    const publicCount = repos.filter((r) => !r.isPrivate).length;

    return NextResponse.json({
      success: true,
      repos,
      count: repos.length,
      privateCount,
      publicCount,
      hasToken,
      account: account.username,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, repos: [] },
      { status: 500 }
    );
  }
}
