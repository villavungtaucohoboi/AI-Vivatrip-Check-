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
  // Supabase trả tối đa 1.000 dòng/lần → lấy theo nhóm tour nhỏ + phân trang, chạy song song, không mất ngày nào.
  const PAGE = 1000;
  const loadGroup = async (group: string[]) => {
    const out: TourDeparture[] = [];
    for (let from = 0; ; from += PAGE) {
      let dq = supabase.from("tour_departures").select("*").in("tour_id", group).order("depart_date").order("id");
      if (opts.fromDate) dq = dq.gt("depart_date", opts.fromDate);
      const { data, error: e } = await dq.range(from, from + PAGE - 1);
      if (e) throw new Error(e.message);
      out.push(...((data ?? []) as TourDeparture[]));
      if (!data || data.length < PAGE) break;
    }
    return out;
  };
  const groups: string[][] = [];
  for (let i = 0; i < ids.length; i += 60) groups.push(ids.slice(i, i + 60));
  try {
    for (const part of await Promise.all(groups.map(loadGroup))) deps.push(...part);
  } catch (e) {
    return { tours: [], error: e instanceof Error ? e.message : "Lỗi tải ngày khởi hành" };
  }
  const by = new Map<string, TourDeparture[]>();
  for (const d of deps) by.set(d.tour_id!, [...(by.get(d.tour_id!) ?? []), { ...d, depart_date: String(d.depart_date).slice(0, 10) }]);
  return {
    tours: ((tours ?? []) as Tour[]).map((t) => ({
      ...t,
      places: t.places ?? [],
      highlights: t.highlights ?? [],
      images: t.images ?? [],
      image_credits: t.image_credits ?? [],
      itinerary: Array.isArray(t.itinerary) ? t.itinerary : [],
      includes: t.includes ?? [],
      excludes: t.excludes ?? [],
      visa_notes: t.visa_notes ?? [],
      sale_terms: t.sale_terms ?? [],
      departures: by.get(t.id) ?? [],
    })),
  };
}
