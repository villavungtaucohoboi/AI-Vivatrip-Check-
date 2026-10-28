import "server-only";
import crypto from "crypto";

/**
 * KHO ẢNH CLOUDFLARE R2 (bucket "vivatrip-anh", xem ảnh qua https://anh.vivatrip.vn).
 * Trình duyệt up ảnh THẲNG lên R2 bằng link ký sẵn (presigned URL) → không đi qua Vercel, không tốn băng thông web.
 * Cần 2 biến môi trường trên Vercel (Settings → Environment Variables):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  (mã truy cập "vivatrip-anh-upload" tạo trong Cloudflare → R2 → API Tokens)
 * Tuỳ chọn: R2_ACCOUNT_ID, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL (mặc định đã điền sẵn bên dưới).
 */
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "ac05e3f80d65f0c7f99d79a0a4e2c9e4";
export const R2_BUCKET = process.env.R2_BUCKET || "vivatrip-anh";

export function r2Ready(): string | null {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY)
    return "Chưa cài mã R2 trên Vercel (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) — vào Vercel → Settings → Environment Variables, thêm 2 biến rồi Redeploy.";
  return null;
}

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: crypto.BinaryLike, s: string) => crypto.createHmac("sha256", key).update(s).digest();
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Link PUT ký sẵn (AWS SigV4, chuẩn S3) — hết hạn sau `expires` giây. */
export function presignPut(key: string, expires = 3600): string {
  const ak = process.env.R2_ACCESS_KEY_ID!;
  const sk = process.env.R2_SECRET_ACCESS_KEY!;
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // 20261028T101500Z
  const date = amzDate.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const path = `/${R2_BUCKET}/${key.split("/").map(enc).join("/")}`;
  const params: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${ak}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expires)],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const qs = params
    .map(([k, v]) => [enc(k), enc(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonical = ["PUT", path, qs, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${sk}`, date), "auto"), "s3"), "aws4_request");
  const sig = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}
