import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { CruiseBulk } from "@/components/admin/bulk/cruise-bulk";

export default function CruiseBulkAddPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Du thuyền — Thêm hàng loạt"
        subtitle="Điền nhiều du thuyền một lúc, tích sẵn bữa ăn và dịch vụ bao gồm, nhập lịch trình, hạng cabin và tải file lịch trình."
      />
      <CruiseBulk mode="add" initial={[]} />
    </main>
  );
}
