import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortPricingSheet, type ResortRow } from "@/components/admin/bulk/resort-pricing-sheet";
import type { HotelRate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResortBulkEditPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  // select("*") để vẫn chạy khi chưa chạy SQL 0026 (các cột mới sẽ là undefined)
  const { data: resorts } = await supabase
    .from("products")
    .select("*")
    .in("type", ["resort", "hotel", "homestay"])
    .order("area")
    .order("product_name");

  const ids = (resorts ?? []).map((r) => r.id as string);
  const { data: rates } = ids.length ? await supabase.from("hotel_rates").select("*").in("product_id", ids) : { data: [] };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Resort · Khách sạn · Homestay — Bảng giá"
        subtitle="Mỗi nơi tự khai các GIAI ĐOẠN giá (thường, cao điểm, đỉnh điểm, lễ Tết…) với khoảng ngày riêng. Dán hợp đồng / ảnh bảng giá để AI điền sẵn, xem lại rồi Lưu."
      />
      <ResortPricingSheet resorts={(resorts ?? []) as ResortRow[]} rates={(rates ?? []) as HotelRate[]} openNew={sp.new === "1"} />
    </main>
  );
}
