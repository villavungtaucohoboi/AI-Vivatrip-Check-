"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function loginAdmin(
  password: string
): Promise<{ ok: true } | { error: string }> {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { error: "Chưa cấu hình mật khẩu Admin (thiếu biến môi trường ADMIN_PASSWORD)." };
  }

  if (password !== expected) {
    return { error: "Sai mật khẩu. Vui lòng thử lại." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
    path: "/",
  });

  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/search");
}
