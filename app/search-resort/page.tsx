import { createClient } from "@/lib/supabase/server";
import { ResortSearchExperience } from "@/components/resort-search-experience";
import { normalizeAreaName } from "@/lib/normalize-area";

export const revalidate = 30;

export default async function SearchResortPage() {
  const supabase = await createClient();

  const { data: areaRows } = await supabase.rpc("get_distinct_areas");

  const areaSet = new Map<string, string>();
  (areaRows ?? []).forEach((r: { area: string }) => {
    const canonical = normalizeAreaName(r.area);
    const key = canonical.toLowerCase();
    if (!areaSet.has(key)) areaSet.set(key, canonical);
  });
  const areas = [...areaSet.values()].sort((a, b) => a.localeCompare(b, "vi"));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <ResortSearchExperience areas={areas} />
    </main>
  );
}
