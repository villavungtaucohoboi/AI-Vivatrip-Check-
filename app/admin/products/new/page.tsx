import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role="admin" />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="mb-5 font-display text-2xl text-ink">Thêm sản phẩm</h1>
        <ProductForm />
      </main>

      <BottomNav role="admin" />
    </div>
  );
}
