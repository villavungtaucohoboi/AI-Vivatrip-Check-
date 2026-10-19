import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tour, TourDeparture, TourWithDeps } from "@/lib/tour-types";

/** Tải tour + ngày khởi hành. onlyUpcoming: chỉ lấy ngày SAU hôm nay (ngày đã qua tự ẩn). */
export async function fetchTours(
  supabase: SupabaseClient,
  opts: { includeHidden?: boolean; fromDate?: string } = {}
): Promise<{ tours: TourWithDeps[]; error?: string }> {
  let q = supabase.from("tours").select("*").order("country").order("name");
  if (!opts.includeHidden) q = q.eq("hidden", false);
  const { data: tours, error } = await q;
  if (error) return { tours: [], error: /does not exist|schema cache/i.test(error.message) ? "Chưa chạy SQL 0030_tours.sql trên Supabase." : error.message };
  const ids = (tours ?? []).map((t) => t.id as string);
  const deps: TourDeparture[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    let dq = supabase.from("tour_departures").select("*").in("tour_id", ids.slice(i, i + 150)).order("depart_date");
    if (opts.fromDate) dq = dq.gt("depart_date", opts.fromDate);
    const { data } = await dq.limit(10000);
    deps.push(...((data ?? []) as TourDeparture[]));
  }
  const by = new Map<string, TourDeparture[]>();
  for (const d of deps) by.set(d.tour_id!, [...(by.get(d.tour_id!) ?? []), { ...d, depart_date: String(d.depart_date).slice(0, 10) }]);
  return {
    tours: ((tours ?? []) as Tour[]).map((t) => ({
      ...t,
      places: t.places ?? [],
      highlights: t.highlights ?? [],
      itinerary: Array.isArray(t.itinerary) ? t.itinerary : [],
      includes: t.includes ?? [],
      excludes: t.excludes ?? [],
      visa_notes: t.visa_notes ?? [],
      sale_terms: t.sale_terms ?? [],
      departures: by.get(t.id) ?? [],
    })),
  };
}
