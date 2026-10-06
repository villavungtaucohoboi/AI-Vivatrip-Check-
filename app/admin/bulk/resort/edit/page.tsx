import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortBulkEdit, type RateSource, type ResortSource } from "@/components/admin/bulk/resort-bulk-edit";

export default async function ResortBulkEditPage() {
  const supabase = await createClient();
  const { data: resorts } = await supabase
    .from("products")
    .select("id, product_code, product_name, area, type")
    .in("type", ["resort", "hotel"])
    .order("area")
    .order("product_name");

  const ids = (resorts ?? []).map((r) => r.id as string);
  const { data: rates } = ids.length
    ? await supabase
        .from("hotel_rates")
        .select("id, product_id, room_type, price, capacity, extra_bed_price, breakfast")
        .in("product_id", ids)
        .order("price")
    : { data: [] };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Resort / Hotel — Sửa giá hàng loạt"
        subtitle="Mỗi hạng phòng là 1 dòng ngay dưới tên resort. Sửa giá, sức chứa, extra bed, ăn sáng rồi bấm Lưu tất cả 1 lần. Giá thấp nhất của resort tự cập nhật theo."
      />
      <ResortBulkEdit resorts={(resorts ?? []) as ResortSource[]} rates={(rates ?? []) as RateSource[]} />
    </main>
  );
}
