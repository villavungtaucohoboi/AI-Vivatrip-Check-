import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/components/admin/import-wizard";

export default async function ImportPage() {

  return (

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="mb-2 font-display text-2xl text-ink">Import Excel</h1>
        <p className="mb-5 text-[13px] text-ink-muted">
          File bảng giá <b>khách sạn / resort</b> (nhiều giai đoạn, hạng phòng)? Up ở đây cũng được — web tự nhận ra, hoặc vào{" "}
          <Link href="/admin/bulk/resort/import" className="font-bold text-teal-dark underline">
            Nhập file Excel bảng giá khách sạn
          </Link>
          .
        </p>
        <ImportWizard />
      </main>
  );
}
