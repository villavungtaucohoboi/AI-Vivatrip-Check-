import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortBulkAdd } from "@/components/admin/bulk/resort-bulk-add";

export default function ResortBulkAddPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Resort / Hotel — Thêm hàng loạt"
        subtitle="Điền nhiều resort/khách sạn một lúc, mỗi nơi nhập được nhiều hạng phòng, tiện ích, nội dung, ảnh như thêm từng cái."
      />
      <ResortBulkAdd />
    </main>
  );
}
