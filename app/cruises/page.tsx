import { createPublicClient } from "@/lib/supabase/public-client";
import { fetchCruises } from "@/lib/cruise-data";
import { CruiseSaleView } from "@/components/cruises/cruise-sale-view";

export const revalidate = 30;

export default async function CruisesPage() {
  // Client không đọc cookie → trang được cache 30s thật sự (trước đây đọc
  // cookie nên Next.js bỏ qua revalidate, lần nào mở cũng truy vấn lại).
  const supabase = createPublicClient();
  const cruises = await fetchCruises(supabase, { onlyActive: true });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <CruiseSaleView cruises={cruises} />
    </main>
  );
}
