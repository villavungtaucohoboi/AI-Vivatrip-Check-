// Phiên "Sale" cho khu soạn báo giá: 1 mật khẩu chung (SALE_PASSWORD).
// Cookie KHÔNG chứa mật khẩu mà chứa HMAC-SHA256 của 1 chuỗi cố định, khoá = mật khẩu.
// Chỉ dùng Web Crypto → chạy được cả ở Edge middleware lẫn Node.

export const SALE_COOKIE = "vivatrip_sale";
const MESSAGE = "vivatrip-sale-v1";

export async function saleToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(MESSAGE));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isSaleTokenValid(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await saleToken(secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
