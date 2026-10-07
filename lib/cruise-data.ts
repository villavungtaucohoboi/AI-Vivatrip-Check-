import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cruise, CruiseCabin, CruiseChildPrice, CruiseFile, CruiseImage, CruiseMeal } from "@/lib/cruise-types";

/** Lấy danh sách du thuyền kèm hạng cabin + file đính kèm (dùng chung cho trang Sale và Admin). */
export async function fetchCruises(supabase: SupabaseClient, opts: { onlyActive?: boolean } = {}): Promise<Cruise[]> {
  let q = supabase.from("cruises").select("*").order("category").order("sort_order").order("name");
  if (opts.onlyActive) q = q.eq("is_active", true);
  const { data: rows } = await q;
  const list = rows ?? [];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id as string);
  const [{ data: cabins }, { data: files }, { data: childs }, { data: imgs }] = await Promise.all([
    supabase.from("cruise_cabins").select("*").in("cruise_id", ids).order("sort_order"),
    supabase.from("cruise_files").select("*").in("cruise_id", ids).order("created_at"),
    supabase.from("cruise_child_prices").select("*").in("cruise_id", ids).order("sort_order"),
    supabase.from("cruise_images").select("*").in("cruise_id", ids).order("sort_order"),
  ]);

  return list.map((c) => ({
    id: c.id,
    category: c.category,
    name: c.name,
    duration_label: c.duration_label,
    star: c.star,
    variant: c.variant ?? null,
    price_adult: Number(c.price_adult),
    price_child: Number(c.price_child),
    discount_percent: Number(c.discount_percent),
    meals: (Array.isArray(c.meals) ? c.meals : []) as CruiseMeal[],
    services: (Array.isArray(c.services) ? c.services : []) as string[],
    itinerary: c.itinerary ?? "",
    note: c.note,
    sort_order: c.sort_order,
    is_active: c.is_active,
    capacity: c.capacity ?? null,
    cabin_count: c.cabin_count ?? null,
    itinerary_url: c.itinerary_url ?? null,
    child_prices: ((childs ?? []) as (CruiseChildPrice & { cruise_id: string })[])
      .filter((x) => x.cruise_id === c.id)
      .map((x) => ({ id: x.id, age_label: x.age_label, age_from: x.age_from ?? null, age_to: x.age_to ?? null, price: Number(x.price) })),
    images: ((imgs ?? []) as (CruiseImage & { cruise_id: string })[])
      .filter((x) => x.cruise_id === c.id)
      .map((x) => ({ id: x.id, url: x.url })),
    cabins: ((cabins ?? []) as CruiseCabin[])
      .filter((x) => x.cruise_id === c.id)
      .map((x) => ({ ...x, price: Number(x.price) })),
    files: ((files ?? []) as CruiseFile[])
      .filter((f) => f.cruise_id === c.id)
      .map((f) => ({ ...f, file_size: Number(f.file_size) })),
  }));
}

export async function fetchCruiseById(supabase: SupabaseClient, id: string): Promise<Cruise | null> {
  const { data } = await supabase.from("cruises").select("id").eq("id", id).maybeSingle();
  if (!data) return null;
  const all = await fetchCruises(supabase);
  return all.find((c) => c.id === id) ?? null;
}
