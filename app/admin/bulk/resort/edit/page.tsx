import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { ResortPricingSheet, type ResortRow } from "@/components/admin/bulk/resort-pricing-sheet";
import type { HotelRate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResortBulkEditPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  // select("*") để vẫn chạy khi chưa chạy SQL 0026 (các cột mới sẽ là undefined)
  const { data: resorts } = await supabase
    .from("products")
    .select("*")
    .in("type", ["resort", "hotel", "homestay"])
    .order("area")
    .order("product_name");

  const ids = (resorts ?? []).map((r) => r.id as string);
  const [{ data: rates }, { data: imgs }] = ids.length
    ? await Promise.all([
        supabase.from("hotel_rates").select("*").in("product_id", ids),
        supabase.from("product_images").select("product_id, image_url, sort_order").in("product_id", ids).order("sort_order"),
      ])
    : [{ data: [] }, { data: [] }];
  const images: Record<string, string[]> = {};
  for (const im of (imgs ?? []) as { product_id: string; image_url: string }[]) {
    (images[im.product_id] ??= []).push(im.image_url);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Resort · Khách sạn · Homestay — Bảng giá"
        subtitle="Mỗi nơi tự khai các GIAI ĐOẠN giá (thường, cao điểm, đỉnh điểm, lễ Tết…) với khoảng ngày riêng. Dán hợp đồng / ảnh bảng giá để AI điền sẵn, xem lại rồi Lưu."
      />
      <a href="/admin/bulk/resort/import" className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-teal/40 bg-teal-light/50 px-3 py-2 text-[13px] font-bold text-teal-dark">
        📥 Nhập file Excel bảng giá (nhiều khách sạn 1 lần)
      </a>
      <ResortPricingSheet resorts={(resorts ?? []) as ResortRow[]} rates={(rates ?? []) as HotelRate[]} images={images} openNew={sp.new === "1"} />
    </main>
  );
}
