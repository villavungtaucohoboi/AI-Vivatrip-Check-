// Điền phương án báo giá từ sản phẩm trong kho (villa / resort / khách sạn).
// CHỈ lấy thông tin gửi khách được: tên, khu vực, ảnh, quyền lợi (perks) và giá bán.
// Resort/khách sạn có hạng phòng: đơn giá = giá SAU "CK %" của hạng phòng, kèm giá trước CK (list_price) để khách so sánh.
// KHÔNG đọc price_source, contract_summary, surcharge_note, note, chiết khấu nội bộ của villa.
import { getApplicablePrice } from "@/lib/pricing";
import { quoteStay } from "@/lib/resort-pricing";
import { newId, type QuoteItem, type QuoteOption } from "@/lib/quote-types";
import type { Holiday, HotelRate, Product } from "@/lib/types";

export function optionFromProduct(p: Product): Pick<QuoteOption, "name" | "place" | "image_url" | "highlights" | "product_id"> {
  const highlights = (p.perks ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-•●*+✓✔]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    name: p.product_name,
    place: [p.area, p.sub_region].filter(Boolean).join(" · "),
    image_url: p.thumbnail_url ?? "",
    highlights,
    product_id: p.id,
  };
}

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function stayItem(o: Partial<QuoteItem> & Pick<QuoteItem, "name" | "unit_price" | "times" | "qty_unit">): QuoteItem {
  return { id: newId(), group: "Nơi nghỉ", note: "", qty: 1, times_unit: "đêm", vat: false, ...o };
}

/** Các đêm từ `from` tới trước `to` (tối đa 30) */
function nightsOf(from: string, to: string | null): string[] {
  const [y, m, d] = from.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  let n = 1;
  if (to) {
    const [y2, m2, d2] = to.split("-").map(Number);
    const diff = Math.round((new Date(y2, m2 - 1, d2).getTime() - start.getTime()) / 86_400_000);
    if (diff >= 1 && diff <= 30) n = diff;
  }
  return Array.from({ length: n }, (_, i) => isoOf(new Date(y, m - 1, d + i)));
}

export function buildStayItems(a: { product: Product; rate: HotelRate | null; holidays: Holiday[]; from: string | null; to: string | null }): QuoteItem[] {
  const { product: p, rate, holidays, from, to } = a;
  const qty_unit = p.type === "villa" ? "villa" : "phòng";

  if (!from) {
    return [stayItem({ name: rate ? roomName(rate) : p.product_name, unit_price: rate ? Number(rate.price) || null : p.price_weekday ?? p.price ?? null, times: 1, qty_unit, note: "Giá ngày thường (chưa chọn ngày)" })];
  }

  if (rate) {
    const q = quoteStay(rate, p, holidays, from, to ?? undefined);
    return [stayItem({ name: roomName(rate), unit_price: q.avg, list_price: q.avg != null && q.avgBase != null && q.avgBase > q.avg ? q.avgBase : null, times: q.nights.length, qty_unit: "phòng", note: rate.breakfast ? "Gồm ăn sáng" : "" })];
  }

  // Villa / resort chưa nhập hạng phòng: giá từng đêm, gom các đêm cùng giá
  const groups = new Map<string, { price: number | null; dates: string[] }>();
  for (const night of nightsOf(from, to)) {
    const [y, m, d] = night.split("-").map(Number);
    const price = getApplicablePrice(p, new Date(y, m - 1, d), holidays).price;
    const key = String(price);
    const g = groups.get(key) ?? { price, dates: [] };
    g.dates.push(night);
    groups.set(key, g);
  }
  const many = groups.size > 1;
  return [...groups.values()].map((g) =>
    stayItem({ name: many ? `${p.product_name} – đêm ${g.dates.map(dm).join(", ")}` : p.product_name, unit_price: g.price, times: g.dates.length, qty_unit })
  );
}

function roomName(rate: HotelRate): string {
  return `${rate.room_type}${rate.rate_plan ? ` – ${rate.rate_plan}` : ""}`;
}
