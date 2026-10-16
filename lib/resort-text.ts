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

export function roomMeta(r: Pick<HotelRate, "area_m2" | "bed" | "capacity" | "breakfast">): string[] {
  return [
    r.area_m2 ? `${r.area_m2}m²` : "",
    r.bed ?? "",
    r.capacity ? `${r.capacity} khách` : "",
    r.breakfast ? "Ăn sáng" : "",
  ].filter(Boolean);
}

/** Mô tả gửi khách — KHÔNG có giá, KHÔNG có hợp đồng. */
export function resortQuoteText(product: Product, rates: HotelRate[]): string {
  const lines: string[] = [];
  lines.push(`🏨 ${product.product_name.toUpperCase()}`);
  lines.push(`📍 ${product.address || (product.sub_region ? `${product.sub_region}, ${product.area}` : product.area)}`);
  const am = AMENITY_TEXT.filter((a) => product[a.key]).map((a) => a.label);
  if (am.length) lines.push("", "🌟 TIỆN ÍCH", ...am.map((a) => `✅ ${a}`));
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
