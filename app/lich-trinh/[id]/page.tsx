import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { QuoteToolbar } from "@/components/quote/quote-toolbar";
import { TourPdf, cleanTourName } from "@/components/tours/tour-pdf";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { Tour, TourDeparture, TourWithDeps } from "@/lib/tour-types";
import { isFull, todayVN } from "@/lib/tour-utils";

// LỊCH TRÌNH TOUR ĐỂ GỬI KHÁCH — sale bấm "Xuất PDF" ở trang /tours. ?d=YYYY-MM-DD: chỉ in giá ngày đó.
export const dynamic = "force-dynamic";

const load = cache(async (id: string): Promise<TourWithDeps | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = createPublicClient();
  const { data: t } = await sb.from("tours").select("*").eq("id", id).maybeSingle();
  if (!t) return null;
  const { data: deps } = await sb.from("tour_departures").select("*").eq("tour_id", id).gt("depart_date", todayVN()).order("depart_date").limit(500);
  const x = t as Tour;
  return {
    ...x,
    places: x.places ?? [],
    highlights: x.highlights ?? [],
    images: x.images ?? [],
    image_credits: x.image_credits ?? [],
    itinerary: Array.isArray(x.itinerary) ? x.itinerary : [],
    includes: x.includes ?? [],
    excludes: x.excludes ?? [],
    visa_notes: x.visa_notes ?? [],
    sale_terms: [],
    departures: ((deps ?? []) as TourDeparture[]).map((d) => ({ ...d, depart_date: String(d.depart_date).slice(0, 10) })),
  };
});

const fileSafe = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = await load((await params).id);
  return { title: t ? `${cleanTourName(t.name)} – VivaTrip` : "Lịch trình – VivaTrip", robots: { index: false, follow: false } };
}

export default async function TourPdfPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const t = await load((await params).id);
  if (!t) notFound();
  const { d } = await searchParams;
  const open = t.departures.filter((x) => !isFull(x));
  const picked = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? open.filter((x) => x.depart_date === d) : [];
  const departures = picked.length ? picked : open.slice(0, 16);
  return (
    <main className="min-h-dvh bg-paper pb-8 print:bg-white print:pb-0">
      <QuoteToolbar salePhone="" fileName={`Lich-trinh-${fileSafe(cleanTourName(t.name))}`} />
      <div className="sm:px-4 print:px-0">
        <TourPdf tour={t} departures={departures} />
      </div>
    </main>
  );
}
