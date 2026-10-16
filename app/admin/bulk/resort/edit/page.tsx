import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortPricingSheet, type ResortRow } from "@/components/admin/bulk/resort-pricing-sheet";
import type { HotelRate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResortBulkEditPage() {
  const supabase = await createClient();
  // select("*") để vẫn chạy khi chưa chạy SQL 0026 (các cột mới sẽ là undefined)
  const { data: resorts } = await supabase
    .from("products")
    .select("*")
    .in("type", ["resort", "hotel"])
    .order("area")
    .order("product_name");

  const ids = (resorts ?? []).map((r) => r.id as string);
  const { data: rates } = ids.length ? await supabase.from("hotel_rates").select("*").in("product_id", ids) : { data: [] };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Resort / Khách sạn — Bảng giá hàng loạt"
        subtitle="Mỗi resort là 1 khung: hạng phòng × 5 mức giá (thấp/cao điểm × ngày thường/cuối tuần + lễ Tết). Bấm “AI điền từ hợp đồng / ảnh” để AI tự nhập, xem lại rồi Lưu tất cả."
      />
      <ResortPricingSheet resorts={(resorts ?? []) as ResortRow[]} rates={(rates ?? []) as HotelRate[]} />
    </main>
  );
}
