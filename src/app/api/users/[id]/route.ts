import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword, saveMasterCredentialsFile } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    if (session.userId === id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own admin account" },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session || (session.role !== "ADMIN" && session.userId !== id)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { role, name, password } = body;

    const dataToUpdate: any = {};
    // Only administrators can change roles
    if (role && session.role === "ADMIN" && ["ADMIN", "DEVELOPER", "VIEWER"].includes(role)) {
      dataToUpdate.role = role;
    }
    if (name) dataToUpdate.name = name;
    if (password) {
      const { hash, salt } = hashPassword(password);
      dataToUpdate.password = hash;
      dataToUpdate.salt = salt;
    }

    const updated = await db.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, email: true, name: true, role: true },
    });

    // If an administrator updated their password, keep the VPS colyin-credentials.txt file in sync
    if (password && updated.role === "ADMIN") {
      saveMasterCredentialsFile(updated.email, password);
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
