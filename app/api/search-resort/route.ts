import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public-client";
import { getAllProducts, getAllRates } from "@/lib/catalog";
import { parseQuery } from "@/lib/query-parser";
import { hasPhrase, matchPlaces, placeNorm } from "@/lib/vn-places";
import { minRatePrice, quoteStay, type StayQuote } from "@/lib/resort-pricing";
import { groupKeyOf, sourceLabel } from "@/lib/hotel-group";
import type { Holiday, HotelRate, Product, ProductType, SearchFilters } from "@/lib/types";

// TÌM RESORT / KHÁCH SẠN
// VD "khách sạn Hạ Long phòng 2 người tầm 1tr2/đêm 10-12/10":
//  - đọc khu vực, số khách/phòng, ngân sách/đêm, ngày ở (→ số đêm)
//  - tính giá TỪNG hạng phòng cho đúng các đêm đó (theo mùa, cuối tuần, lễ)
//  - chọn hạng phòng hợp nhất của mỗi nơi → chia 2 nhóm: VỪA NGÂN SÁCH và
//    CAO HƠN MỘT CHÚT (giống cách tìm Villa)

const getHolidays = unstable_cache(
  async () => {
    const { data } = await createPublicClient().from("holidays").select("*");
    return (data ?? []) as Holiday[];
  },
  ["resort-holidays"],
  { revalidate: 60, tags: ["holidays"] }
);
const getAreas = unstable_cache(
  async () => {
    const { data } = await createPublicClient().rpc("get_distinct_areas");
    return ((data ?? []) as { area: string }[]).map((r) => r.area);
  },
  ["resort-areas"],
  { revalidate: 60, tags: ["products"] }
);

export interface ResortRateResult extends HotelRate {
  quote: StayQuote | null;
  nightly: number | null;
  fitsGuests: boolean;
}
export interface ResortResult {
  product: Product;
  rates: ResortRateResult[];
  bestRateId: string | null;
  bestNightly: number | null;
  group: "fit" | "above" | "all";
  images: string[];
  /** Cùng khách sạn nhưng ở ĐỐI TÁC khác, giá cao hơn (đã ẩn) — rẻ → đắt */
  partners?: ResortPartner[];
}
export interface ResortPartner {
  id: string;
  source: string;
  nightly: number | null;
  roomType: string | null;
}
export interface ResortSearchResponse {
  results: ResortResult[];
  total: number;
  fitCount: number;
  parsedFilters: SearchFilters;
  nights: number;
  holidays: Holiday[];
}

/** Resort chưa nhập hạng phòng → coi giá chung (kiểu villa) là 1 hạng phòng. */
function fallbackRate(p: Product): HotelRate | null {
  const base = p.price_weekday ?? p.price;
  if (!base) return null;
  return {
    id: `p-${p.id}`,
    product_id: p.id,
    room_type: "Giá chung",
    price: base,
    capacity: p.standard_guests,
    breakfast: false,
    extra_bed_price: null,
    note: null,
    updated_at: p.updated_at,
    price_low_weekday: p.price_weekday ?? p.price,
    price_low_weekend: p.price_friday_sunday,
    price_holiday: p.price_saturday_holiday,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    filters?: SearchFilters;
    offset?: number;
    limit?: number;
  };
  const query = body.query?.trim() ?? "";
  const offset = body.offset ?? 0;
  const limit = Math.min(body.limit ?? 12, 50);

  const [areas, holidays, products, rates] = await Promise.all([getAreas(), getHolidays(), getAllProducts(), getAllRates()]);
  const parsed = query ? parseQuery(query, areas) : {};
  // Bộ lọc tay ưu tiên hơn câu chữ
  const f: SearchFilters = { ...parsed, ...(body.filters ?? {}) };
  // Câu chữ đoán ra "villa" trên trang resort → bỏ
  if (f.type === "villa") delete f.type;

  const types: ProductType[] = f.type ? [f.type] : ["resort", "hotel", "homestay"];
  const ratesBy = new Map<string, HotelRate[]>();
  for (const r of rates) ratesBy.set(r.product_id, [...(ratesBy.get(r.product_id) ?? []), r]);

  // ĐỊA DANH: "Quảng Ninh" → Hạ Long, Bãi Cháy, Tuần Châu, Vân Đồn…; "Tuần Châu" → đúng Tuần Châu
  // (khu vực chọn tay ở bộ lọc vẫn ưu tiên hơn câu chữ)
  const place = !body.filters?.area && query ? matchPlaces(query) : null;
  let placeTest = place?.test ?? null;
  if (place) f.area = place.label;
  const areaN = !place && f.area ? placeNorm(f.area) : "";
  // tên còn lại sau khi bỏ địa danh + chữ chung chung (khách sạn, resort…)
  const GENERIC = new Set(["khach", "san", "ks", "hotel", "resort", "homestay", "villa", "o", "tai", "gan", "quanh", "khu", "vuc"]);
  const nameWords = placeNorm(f.name ?? "")
    .split(" ")
    .filter((w) => w.length >= 2 && w !== "|" && !GENERIC.has(w) && !/^\d+$/.test(w) && !place?.words.includes(w));
  const nameN = nameWords.join(" ");
  const otherText = (p: Product) => `${p.sub_region ?? ""} | ${p.address ?? ""} | ${p.product_name} | ${p.group_key ?? ""}`;
  const placeText = (p: Product) => placeNorm(`${p.area ?? ""} | ${otherText(p)}`);
  // không có khách sạn nào đúng điểm nhỏ (VD Tuần Châu) → mở rộng ra khu vực cha (Hạ Long)
  if (place && place.wider) {
    const any = products.some((p) => types.includes(p.type) && place.test(p.area ?? "", otherText(p)));
    if (!any) {
      placeTest = place.wider.test;
      f.area = `${place.wider.label} (không có khách sạn đúng ${place.label})`;
    }
  }
  // mức khớp tên: 2 = đủ mọi chữ, 1 = quá nửa số chữ, 0 = không
  const nameLevel = (p: Product) => {
    if (!nameWords.length) return 0;
    const t = placeText(p);
    const n = nameWords.filter((w) => hasPhrase(t, w)).length;
    return n === nameWords.length ? 2 : n * 2 > nameWords.length ? 1 : 0;
  };
  const budget = f.budget ?? null;
  const nights = f.date && f.checkout ? Math.max(1, Math.round((Date.parse(f.checkout) - Date.parse(f.date)) / 86400000)) : 1;

  const scored: (ResortResult & { score: number; diff: number; cheapest: number; cheapestRoom: string })[] = [];
  for (const p of products) {
    if (!types.includes(p.type)) continue;
    if (f.star && (p.star ?? 0) < f.star) continue;
    if (placeTest && !placeTest(p.area ?? "", otherText(p))) continue;
    if (areaN && !hasPhrase(placeText(p), areaN)) continue;

    const own = [...(ratesBy.get(p.id) ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price);
    const list = own.length ? own : [fallbackRate(p)].filter((x): x is HotelRate => !!x);
    if (!list.length) continue;

    const withQuote: ResortRateResult[] = list.map((r) => {
      const quote = f.date ? quoteStay(r, p, holidays, f.date, f.checkout) : null;
      const nightly = quote ? quote.avg : minRatePrice(r, p);
      const fitsGuests = !f.guests || r.capacity == null || r.capacity >= f.guests;
      return { ...r, quote, nightly, fitsGuests };
    });

    // Hạng phòng đại diện: đủ chỗ cho số khách, gần ngân sách nhất (ưu tiên không vượt)
    const pool = withQuote.filter((r) => r.fitsGuests && r.nightly != null);
    const candidates = pool.length ? pool : withQuote.filter((r) => r.nightly != null);
    if (!candidates.length) continue;
    let best = candidates[0];
    if (budget) {
      const under = candidates.filter((r) => (r.nightly as number) <= budget * 1.1);
      best = under.length
        ? under.reduce((a, b) => ((b.nightly as number) > (a.nightly as number) ? b : a))
        : candidates.reduce((a, b) => ((b.nightly as number) < (a.nightly as number) ? b : a));
    } else best = candidates.reduce((a, b) => ((b.nightly as number) < (a.nightly as number) ? b : a));

    const bn = best.nightly as number;
    if (f.priceFrom && bn < f.priceFrom) continue;
    if (f.priceTo && bn > f.priceTo) continue;

    const lv = nameLevel(p);
    let score = lv * 50;
    if (nameN && placeNorm(p.product_name).includes(nameN)) score += 100;
    if (pool.length) score += 10;
    const group: ResortResult["group"] = !budget ? "all" : bn <= budget * 1.1 ? "fit" : "above";
    const diff = budget ? Math.abs(bn - budget) : bn;

    const cheapest = candidates.reduce((a, b) => ((b.nightly as number) < (a.nightly as number) ? b : a));
    scored.push({ product: p, rates: withQuote, bestRateId: best.id, bestNightly: bn, group, images: [], score, diff, cheapest: cheapest.nightly as number, cheapestRoom: cheapest.room_type });
  }

  // Có gõ tên mà có khách sạn khớp tên → chỉ hiện các khách sạn khớp (không hiện lan man)
  if (nameWords.length) {
    const top = Math.max(0, ...scored.map((x) => nameLevel(x.product)));
    if (top > 0) {
      const keep = scored.filter((x) => nameLevel(x.product) === top);
      scored.length = 0;
      scored.push(...keep);
    }
  }

  // GỘP ĐỐI TÁC: cùng khách sạn → giữ bên RẺ NHẤT, các bên đắt hơn ẩn vào "đối tác khác"
  const groups = new Map<string, typeof scored>();
  for (const x of scored) {
    const k = groupKeyOf(x.product);
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  const merged: typeof scored = [];
  const siblingsOf = new Map<string, string[]>();
  for (const list of groups.values()) {
    list.sort((a, b) => a.cheapest - b.cheapest);
    const [win, ...rest] = list;
    if (rest.length) {
      win.partners = rest.map((x) => ({ id: x.product.id, source: sourceLabel(x.product.price_source), nightly: x.cheapest, roomType: x.cheapestRoom }));
      siblingsOf.set(win.product.id, rest.map((x) => x.product.id));
      // điểm khớp tên lấy cao nhất của cả nhóm
      win.score = Math.max(...list.map((x) => x.score));
    }
    merged.push(win);
  }
  scored.length = 0;
  scored.push(...merged);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.group !== b.group) return a.group === "fit" ? -1 : b.group === "fit" ? 1 : 0;
    return a.diff - b.diff;
  });

  const page = scored.slice(offset, offset + limit);
  // Ảnh của các kết quả đang hiển thị (để copy / gửi Zalo)
  if (page.length) {
    const { data: imgs } = await createPublicClient()
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", page.flatMap((x) => [x.product.id, ...(siblingsOf.get(x.product.id) ?? [])]))
      .order("sort_order");
    const byP = new Map<string, string[]>();
    for (const im of (imgs ?? []) as { product_id: string; image_url: string }[]) {
      byP.set(im.product_id, [...(byP.get(im.product_id) ?? []), im.image_url]);
    }
    for (const x of page) {
      // bên rẻ nhất chưa có ảnh → mượn ảnh của đối tác khác cùng khách sạn
      const sib = (siblingsOf.get(x.product.id) ?? []).map((id) => byP.get(id)).find((v) => v?.length);
      x.images = byP.get(x.product.id) ?? sib ?? (x.product.thumbnail_url ? [x.product.thumbnail_url] : []);
    }
  }

  const res: ResortSearchResponse = {
    results: page.map(({ score: _s, diff: _d, cheapest: _c, cheapestRoom: _r, ...rest }) => rest),
    total: scored.length,
    fitCount: scored.filter((x) => x.group === "fit").length,
    parsedFilters: f,
    nights,
    holidays,
  };
  return NextResponse.json(res);
}
