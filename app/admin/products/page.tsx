import Link from "next/link";
import { CalendarDays, Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { AdminProductTable } from "@/components/admin/admin-product-table";
import type { Product } from "@/lib/types";

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role="admin" />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink">Quản lý sản phẩm</h1>
            <p className="text-sm text-ink-muted">{products?.length ?? 0} sản phẩm trong kho</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/holidays">
              <Button variant="outline">
                <CalendarDays className="h-4 w-4" />
                Ngày lễ
              </Button>
            </Link>
            <Link href="/admin/products/import">
              <Button variant="outline">
                <Upload className="h-4 w-4" />
                Import Excel
              </Button>
            </Link>
            <Link href="/admin/products/new">
              <Button>
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </Link>
          </div>
        </div>

        <AdminProductTable initialProducts={(products ?? []) as Product[]} />
      </main>

      <BottomNav role="admin" />
    </div>
  );
}
