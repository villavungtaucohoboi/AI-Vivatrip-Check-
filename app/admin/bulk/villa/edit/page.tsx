import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { VillaBulkEdit, type VillaEditSource } from "@/components/admin/bulk/villa-bulk-edit";

export default async function VillaBulkEditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, product_code, product_name, area, extra_guest_fee, price_weekday, price_friday_sunday, price_saturday_holiday, discount_scheme, discount_type, discount_value, discount_weekday_type, discount_weekday_value, discount_friday_sunday_type, discount_friday_sunday_value, discount_saturday_holiday_type, discount_saturday_holiday_value"
    )
    .eq("type", "villa")
    .order("area")
    .order("product_name");

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Villa — Sửa giá hàng loạt"
        subtitle="Gõ thẳng vào ô giá, chiết khấu, phụ thu như Excel. Ô đã sửa tô vàng, sửa xong bấm Lưu tất cả 1 lần. Muốn sửa nội dung, ảnh, tiện ích thì dùng Quản lý sản phẩm như cũ."
      />
      <VillaBulkEdit initial={(data ?? []) as VillaEditSource[]} />
    </main>
  );
}
