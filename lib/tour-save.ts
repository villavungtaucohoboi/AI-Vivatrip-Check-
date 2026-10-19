import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tour, TourDeparture } from "@/lib/tour-types";

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : []);
export const colErr = (m: string) => (/relation .*tours|tour_departures|schema cache|does not exist/i.test(m) ? "Chưa chạy SQL 0030_tours.sql trên Supabase." : m);

export function cleanTour(t: Partial<Tour>) {
  return {
    code: t.code?.trim() || null,
    name: String(t.name ?? "").trim(),
    country: String(t.country ?? "").trim(),
    from_city: String(t.from_city ?? "Hà Nội").trim() || "Hà Nội",
    days: num(t.days),
    nights: num(t.nights),
    airline: t.airline?.trim() || null,
    flights: t.flights?.trim() || null,
    route_text: t.route_text?.trim() || null,
    places: arr(t.places),
    highlights: arr(t.highlights),
    itinerary: (Array.isArray(t.itinerary) ? t.itinerary : [])
      .map((d) => ({ t: String(d?.t ?? "").trim(), meals: String(d?.meals ?? "").trim(), items: arr(d?.items), hotel: String(d?.hotel ?? "").trim() }))
      .filter((d) => d.t || d.items.length),
    includes: arr(t.includes),
    excludes: arr(t.excludes),
    visa_notes: arr(t.visa_notes),
    sale_terms: arr(t.sale_terms),
    partner: t.partner?.trim() || null,
    partner_file: t.partner_file?.trim() || null,
    source_link: t.source_link?.trim() || null,
    group_label: t.group_label?.trim() || null,
    cover_url: t.cover_url?.trim() || null,
    single_usd: num(t.single_usd),
    tips_usd: num(t.tips_usd),
    visa_discount: num(t.visa_discount) ?? 0,
    route_key: t.route_key?.trim() || null,
    hidden: !!t.hidden,
    updated_at: new Date().toISOString(),
  };
}

export function cleanDeps(deps: Partial<TourDeparture>[]): Omit<TourDeparture, "id" | "tour_id">[] {
  const seen = new Map<string, Omit<TourDeparture, "id" | "tour_id">>();
  for (const d of deps ?? []) {
    const date = String(d.depart_date ?? "").slice(0, 10);
    const adult = num(d.adult);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !adult) continue;
    seen.set(date, {
      depart_date: date,
      adult,
      old_adult: num(d.old_adult),
      child: num(d.child),
      infant: num(d.infant),
      com: num(d.com),
      seats: num(d.seats),
      sold: num(d.sold),
      tag: d.tag?.toString().trim() || null,
    });
  }
  return [...seen.values()];
}

/**
 * Ghi ngày khởi hành của 1 tour.
 *  - "replace": xoá các ngày SẮP TỚI không còn trong danh sách mới (file mới của đối tác thay file cũ)
 *  - "merge": chỉ cập nhật ngày trùng + thêm ngày mới
 */
export async function saveDepartures(supabase: SupabaseClient, tourId: string, deps: Partial<TourDeparture>[], mode: "replace" | "merge") {
  const rows = cleanDeps(deps).map((d) => ({ ...d, tour_id: tourId, updated_at: new Date().toISOString() }));
  if (mode === "replace") {
    const keep = rows.map((r) => r.depart_date);
    let q = supabase.from("tour_departures").delete().eq("tour_id", tourId);
    if (keep.length) q = q.not("depart_date", "in", `(${keep.join(",")})`);
    const { error } = await q;
    if (error) throw new Error(colErr(error.message));
  }
  if (rows.length) {
    const { error } = await supabase.from("tour_departures").upsert(rows, { onConflict: "tour_id,depart_date" });
    if (error) throw new Error(colErr(error.message));
  }
  await supabase.from("tours").update({ updated_at: new Date().toISOString() }).eq("id", tourId);
  return rows.length;
}
