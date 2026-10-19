import { createClient } from "@/lib/supabase/server";
import { fetchTours } from "@/lib/tour-data";
import { todayVN } from "@/lib/tour-utils";
import { TourExcelImport } from "@/components/admin/tours/tour-excel-import";

export const dynamic = "force-dynamic";

export default async function TourExcelPage() {
  const today = todayVN();
  const { tours, error } = await fetchTours(await createClient(), { includeHidden: true });
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TourExcelImport tours={tours} today={today} loadError={error} />
    </main>
  );
}
