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
        <h1 className="mb-5 font-display text-2xl text-ink">Import Excel</h1>
        <ImportWizard />
      </main>
  );
}
