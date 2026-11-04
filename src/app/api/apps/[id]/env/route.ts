import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/engine/crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;

    const envs = await db.environmentVariable.findMany({
      where: { applicationId: appId },
      select: {
        id: true,
        key: true,
        encryptedVal: true,
        iv: true,
        authTag: true,
        type: true,
        updatedAt: true,
      },
      orderBy: { key: "asc" },
    });

    const decrypted = envs.map((e) => ({
      id: e.id,
      key: e.key,
      value: decryptSecret(e.encryptedVal, e.iv, e.authTag),
      type: e.type,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({ success: true, variables: decrypted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const body = await req.json();
    const { variables } = body; // Array of { key: string, value: string, type?: "RUNTIME" | "BUILD_TIME" }

    if (!Array.isArray(variables)) {
      return NextResponse.json(
        { success: false, error: "variables must be an array" },
        { status: 400 }
      );
    }

    const updatedKeys: string[] = [];

    for (const v of variables) {
      if (!v.key) continue;
      const encrypted = encryptSecret(v.value || "");

      await db.environmentVariable.upsert({
        where: {
          applicationId_key: {
            applicationId: appId,
            key: v.key,
          },
        },
        create: {
          applicationId: appId,
          key: v.key,
          encryptedVal: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          type: v.type || "RUNTIME",
        },
        update: {
          encryptedVal: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          type: v.type || "RUNTIME",
        },
      });

      updatedKeys.push(v.key);
    }

    return NextResponse.json({ success: true, updatedKeys });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
