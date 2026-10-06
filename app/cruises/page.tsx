import { createClient } from "@/lib/supabase/server";
import { fetchCruises } from "@/lib/cruise-data";
import { CruiseSaleView } from "@/components/cruises/cruise-sale-view";

export const revalidate = 30;

export default async function CruisesPage() {
  const supabase = await createClient();
  const cruises = await fetchCruises(supabase, { onlyActive: true });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <CruiseSaleView cruises={cruises} />
    </main>
  );
}
