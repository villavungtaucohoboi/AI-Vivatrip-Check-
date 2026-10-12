import { createPublicClient } from "@/lib/supabase/public-client";
import { ResortSearchExperience } from "@/components/resort-search-experience";
import { normalizeAreaName } from "@/lib/normalize-area";

export const revalidate = 30;

export default async function SearchResortPage() {
  // Client không đọc cookie → trang được cache 30s thật sự (trước đây đọc
  // cookie nên Next.js bỏ qua revalidate, lần nào mở cũng truy vấn lại).
  const supabase = createPublicClient();

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
