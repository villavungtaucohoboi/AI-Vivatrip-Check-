import type { HotelRate, Product } from "@/lib/types";

const AMENITY_TEXT: { key: keyof Product; label: string }[] = [
  { key: "pool", label: "Hồ bơi" },
  { key: "near_beach", label: "Sát biển" },
  { key: "sea_view", label: "View biển" },
  { key: "near_lake", label: "View hồ" },
  { key: "karaoke", label: "Karaoke" },
  { key: "bbq", label: "BBQ" },
  { key: "pickleball", label: "Pickleball" },
];

export function roomMeta(r: Pick<HotelRate, "area_m2" | "bed" | "capacity" | "breakfast" | "max_children">): string[] {
  return [
    r.area_m2 ? `${r.area_m2}m²` : "",
    r.bed ?? "",
    r.capacity ? `${r.capacity} NL${r.max_children ? ` + ${r.max_children} TE` : ""}` : "",
    r.breakfast ? "Ăn sáng" : "",
  ].filter(Boolean);
}

/** Mô tả gửi khách — KHÔNG có giá, KHÔNG có hợp đồng. */
export function resortQuoteText(product: Product, rates: HotelRate[]): string {
  const lines: string[] = [];
  lines.push(`🏨 ${product.product_name.toUpperCase()}${product.star ? ` ${"⭐".repeat(product.star)}` : ""}`);
  lines.push(`📍 ${product.address || (product.sub_region ? `${product.sub_region}, ${product.area}` : product.area)}`);
  const am = AMENITY_TEXT.filter((a) => product[a.key]).map((a) => a.label);
  if (am.length || product.perks?.trim()) {
    lines.push("", "🌟 TIỆN ÍCH & QUYỀN LỢI");
    am.forEach((a) => lines.push(`✅ ${a}`));
    if (product.perks?.trim()) lines.push(...product.perks.trim().split("\n").filter((l) => !am.some((a) => l.includes(a))));
  }
  const rooms = rates.filter((r) => r.room_type && r.room_type !== "Giá chung");
  if (rooms.length) {
    lines.push("", "🛏️ HẠNG PHÒNG");
    for (const r of rooms) {
      const meta = roomMeta(r);
      lines.push(`▸ ${r.room_type}${meta.length ? ` – ${meta.join(", ")}` : ""}`);
    }
  }
  lines.push("", "☎️ VivaTrip · Hotline 0942.988.699", "💬 Inbox để được báo giá theo ngày nhé!");
  return lines.join("\n");
}

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

/** BÁO GIÁ cho khách theo ngày ở (Sale chủ động gửi) — có giá. */
export function resortPriceQuoteText(
  product: Product,
  rows: { room: HotelRate; avg: number | null; total: number | null; label: string | null }[],
  checkin: string,
  checkout: string | undefined,
  nights: number
): string {
  const d = (s: string) => s.split("-").reverse().join("/");
  const lines: string[] = [];
  lines.push(`🏨 ${product.product_name.toUpperCase()}${product.star ? ` ${"⭐".repeat(product.star)}` : ""}`);
  lines.push(`📅 ${d(checkin)}${checkout ? ` → ${d(checkout)}` : ""} · ${nights} đêm`);
  lines.push("", "💰 BÁO GIÁ / PHÒNG");
  for (const r of rows) {
    if (r.avg == null) continue;
    const meta = roomMeta(r.room);
    lines.push(`▸ ${r.room.room_type}${meta.length ? ` (${meta.join(", ")})` : ""}`);
    lines.push(`   ${vnd(r.avg)}/đêm${nights > 1 && r.total != null ? ` · ${nights} đêm: ${vnd(r.total)}` : ""}`);
  }
  if (product.surcharge_note?.trim()) lines.push("", "➕ PHỤ THU", product.surcharge_note.trim());
  lines.push("", "Giá có thể thay đổi theo tình trạng phòng tại thời điểm đặt.", "☎️ VivaTrip · Hotline 0942.988.699");
  return lines.join("\n");
}
