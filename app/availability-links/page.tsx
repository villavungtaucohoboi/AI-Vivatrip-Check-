import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { AvailabilityLinksApp } from "@/components/availability-links/availability-links-app";
import type { AvailabilityLinkRegion } from "@/lib/availability-link-types";

export const revalidate = 30;

export default async function AvailabilityLinksPage() {
  const supabase = await createClient();
  const { data: regions } = await supabase
    .from("availability_link_regions")
    .select("*")
    .order("sort_order");

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-6">
      <Header role="sale" />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Link check lịch trống</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">
            Chọn "Lịch trống" hoặc "Bảng giá", chọn khu vực rồi bấm vào nguồn để mở nhanh.
          </p>
        </div>
        <AvailabilityLinksApp initialRegions={(regions ?? []) as AvailabilityLinkRegion[]} isAdmin={false} />
      </main>
      <BottomNav role="sale" />
    </div>
  );
}
