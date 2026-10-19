import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTours } from "@/lib/tour-data";
import { todayVN } from "@/lib/tour-utils";
import { TourEditor } from "@/components/admin/tours/tour-editor";
import type { TourWithDeps } from "@/lib/tour-types";

export const dynamic = "force-dynamic";

export default async function TourEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ clone?: string }> }) {
  const { id } = await params;
  const { clone } = await searchParams;
  const today = todayVN();
  const { tours, error } = await fetchTours(await createClient(), { includeHidden: true });
  const partners = [...new Set(tours.map((t) => t.partner ?? "").filter(Boolean))].sort();

  let initial: TourWithDeps | null = null;
  if (id !== "new") {
    initial = tours.find((t) => t.id === id) ?? null;
    if (!initial && !error) notFound();
  } else if (clone) {
    // NHÂN BẢN: giữ nguyên lịch trình, bao gồm, visa… — chưa có ngày khởi hành
    const src = tours.find((t) => t.id === clone);
    if (src) initial = { ...src, id: "", code: null, name: `${src.name} (bản sao)`, departures: [] };
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <TourEditor initial={initial} today={today} partners={partners} loadError={error} cloned={!!clone && id === "new"} />
    </main>
  );
}
