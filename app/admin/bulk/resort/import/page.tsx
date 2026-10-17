import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortExcelImport } from "@/components/admin/bulk/resort-excel-import";

export default function ResortExcelImportPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Nhập file Excel bảng giá khách sạn"
        subtitle="Up file Excel mẫu chuẩn (nhiều khách sạn 1 lần) → xem trước → Nhập. Giá, giai đoạn, hạng phòng, phụ thu, tóm tắt hợp đồng tự lên web và báo giá theo ngày như nhập tay."
      />
      <ResortExcelImport />
    </main>
  );
}
