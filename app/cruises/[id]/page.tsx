import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCruiseById } from "@/lib/cruise-data";
import { CruiseSaleView } from "@/components/cruises/cruise-sale-view";

export const dynamic = "force-dynamic";

// Trang công khai của 1 du thuyền — đây là "Link lịch trình" Sale copy gửi khách.
export default async function CruiseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const cruise = await fetchCruiseById(supabase, id);
  if (!cruise || !cruise.is_active) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <CruiseSaleView cruises={[cruise]} single />
    </main>
  );
}
