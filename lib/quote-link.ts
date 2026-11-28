// Link gửi khách + tin nhắn Zalo
import type { QuoteInput } from "@/lib/quote-types";

// Tên miền link gửi khách: đặt NEXT_PUBLIC_QUOTE_BASE_URL (VD https://baogia.vivatrip.vn) khi đã có tên miền riêng;
// chưa đặt thì dùng chính tên miền đang mở web (hiện tại vivatripcheck.vercel.app).
const DEFAULT_BASE = "https://vivatripcheck.vercel.app";
const currentOrigin = () => (typeof window !== "undefined" && window.location?.origin ? window.location.origin : DEFAULT_BASE);

export function quoteUrl(code: string, base: string = process.env.NEXT_PUBLIC_QUOTE_BASE_URL || currentOrigin()): string {
  return `${base.replace(/\/+$/, "")}/bg/${code}`;
}

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function zaloMessage(q: Pick<QuoteInput, "program" | "customer">, url: string): string {
  const { date_from: f, date_to: t, title } = q.program;
  const when = f ? ` (${dm(f)}${t && t !== f ? `–${dm(t)}` : ""})` : "";
  const who = q.customer.name ? `anh/chị ${q.customer.name}` : "anh/chị";
  return `VivaTrip gửi ${who} báo giá chương trình ${title || ""}${when}: ${url}`.replace(/\s+:/, ":");
}
