import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { VillaBulkAdd } from "@/components/admin/bulk/villa-bulk-add";

export default function VillaBulkAddPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Villa — Thêm hàng loạt"
        subtitle="Điền nhiều villa một lúc trong 1 bảng, đủ giá, chiết khấu, tiện ích, nội dung, ảnh như thêm từng cái. Muốn thêm 1-2 villa thì dùng nút Thêm sản phẩm như cũ."
      />
      <VillaBulkAdd />
    </main>
  );
}
