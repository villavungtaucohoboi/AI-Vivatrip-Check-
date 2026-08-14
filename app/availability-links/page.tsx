import { createClient } from "@/lib/supabase/server";
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
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-4">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Link check lịch trống</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">
            Chọn "Lịch trống" hoặc "Bảng giá", chọn khu vực rồi bấm vào nguồn để mở nhanh.
          </p>
        </div>
        <AvailabilityLinksApp initialRegions={(regions ?? []) as AvailabilityLinkRegion[]} isAdmin={false} />
      </main>
  );
}
