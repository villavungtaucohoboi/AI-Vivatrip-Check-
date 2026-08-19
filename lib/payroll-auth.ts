import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { EMPLOYEE_COOKIE_NAME } from "@/lib/payroll-constants";

export { EMPLOYEE_COOKIE_NAME };

function getSecret(): string {
  // Ưu tiên secret riêng cho Bảng lương; nếu chưa cấu hình thì tạm dùng
  // ADMIN_PASSWORD làm secret (vẫn tốt hơn không ký gì cả) — khuyến khích
  // đặt PAYROLL_SESSION_SECRET riêng trong biến môi trường khi deploy thật.
  return process.env.PAYROLL_SESSION_SECRET || process.env.ADMIN_PASSWORD || "vivatrip-dev-fallback-secret";
}

function sign(employeeId: string): string {
  const hmac = crypto.createHmac("sha256", getSecret()).update(employeeId).digest("hex");
  return `${employeeId}.${hmac}`;
}

function verify(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [employeeId, hmac] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(employeeId).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return employeeId;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createEmployeeSession(employeeId: string) {
  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_COOKIE_NAME, sign(employeeId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyEmployeeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYEE_COOKIE_NAME);
}

export async function getEmployeeIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}
