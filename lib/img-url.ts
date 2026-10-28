/** Địa chỉ xem ảnh trong kho R2 (Cloudflare). */
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://anh.vivatrip.vn").replace(/\/$/, "");

/**
 * Ảnh NHỎ (~25KB) của 1 ảnh trong kho R2: ".../01-abc.webp" → ".../01-abc_t.webp".
 * Ảnh cũ (Supabase) không có bản nhỏ → trả về nguyên link.
 */
export function thumbOf(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.startsWith(R2_PUBLIC_URL) || /_t\.(webp|jpe?g)$/i.test(url)) return url;
  return url.replace(/\.(webp|jpe?g)$/i, "_t.$1");
}
