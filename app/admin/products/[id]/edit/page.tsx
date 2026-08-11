import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { ProductForm } from "@/components/admin/product-form";
import type { HotelRate, Product, ProductImage } from "@/lib/types";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: productRow } = await supabase.from("products").select("*").eq("id", id).single();
  if (!productRow) notFound();
  const product = productRow as Product;

  const [{ data: images }, { data: rates }] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    product.type === "hotel"
      ? supabase.from("hotel_rates").select("*").eq("product_id", id).order("price")
      : Promise.resolve({ data: [] as HotelRate[] }),
  ]);

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
        <h1 className="mb-5 font-display text-2xl text-ink">Sửa sản phẩm</h1>
        <ProductForm
          product={product}
          images={(images ?? []) as ProductImage[]}
          rates={(rates ?? []) as HotelRate[]}
        />
      </main>

      <BottomNav role="admin" />
    </div>
  );
}
