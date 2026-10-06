import { createClient } from "@/lib/supabase/server";
import { fetchCruises } from "@/lib/cruise-data";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { CruiseBulk } from "@/components/admin/bulk/cruise-bulk";

export default async function CruiseBulkEditPage() {
  const supabase = await createClient();
  const cruises = await fetchCruises(supabase);
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Du thuyền — Sửa giá hàng loạt"
        subtitle="Sửa giá, chiết khấu, bữa ăn, dịch vụ, lịch trình, hạng cabin, file đính kèm của nhiều du thuyền một lúc. Sửa xong bấm Lưu tất cả 1 lần."
      />
      <CruiseBulk mode="edit" initial={cruises} />
    </main>
  );
}
