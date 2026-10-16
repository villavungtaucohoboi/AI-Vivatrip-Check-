import "server-only";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { HotelRate, Product } from "@/lib/types";

// ---------------------------------------------------------------------------
// KHO SẢN PHẨM — cache trong bộ nhớ server, KHÔNG giới hạn số lượng.
//
// Trước đây: dùng unstable_cache (tối đa 2MB/mục — kho lớn là không cache
// được, lần tìm nào cũng tải lại toàn bộ) + .limit(2000) (thực tế Supabase
// chỉ trả tối đa 1000 dòng/lần → căn thứ 1001 trở đi KHÔNG BAO GIỜ hiện).
//
// Bây giờ:
//  - Tải toàn bộ kho theo từng lô 1000 dòng, chạy SONG SONG → không mất căn.
//  - Giữ trong RAM của server. Mỗi lượt tìm chỉ hỏi 1 câu rất nhẹ
//    (tổng số căn + thời điểm sửa gần nhất). Có ai thêm/sửa/xoá căn → tự tải
//    lại ngay, nên Admin sửa xong là Sale thấy liền.
// ---------------------------------------------------------------------------
const PAGE = 1000;
const CHECK_EVERY_MS = 3000;

type Catalog = { signature: string; products: Product[] };
let catalog: Catalog | null = null;
let loading: Promise<Catalog> | null = null;
let lastCheckAt = 0;

async function getCatalogSignature(): Promise<{ signature: string; count: number }> {
  const supabase = createPublicClient();
  const { data, count, error } = await supabase
    .from("products")
    .select("updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const latest = (data?.[0] as { updated_at?: string } | undefined)?.updated_at ?? "";
  return { signature: `${count ?? 0}|${latest}`, count: count ?? 0 };
}

async function loadCatalog(signature: string, count: number): Promise<Catalog> {
  const supabase = createPublicClient();
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      supabase
        .from("products")
        .select("*")
        .order("id")
        .range(i * PAGE, i * PAGE + PAGE - 1)
    )
  );
  const products: Product[] = [];
  for (const r of results) {
    if (r.error) throw r.error;
    products.push(...((r.data ?? []) as Product[]));
  }
  return { signature, products };
}

export async function getAllProducts(): Promise<Product[]> {
  const now = Date.now();
  if (catalog && now - lastCheckAt < CHECK_EVERY_MS) return catalog.products;

  const { signature, count } = await getCatalogSignature();
  lastCheckAt = Date.now();
  if (catalog && catalog.signature === signature) return catalog.products;

  // Nhiều người tìm cùng lúc → chỉ tải 1 lần, mọi người dùng chung kết quả.
  if (!loading) {
    loading = loadCatalog(signature, count)
      .then((c) => (catalog = c))
      .finally(() => (loading = null));
  }
  return (await loading).products;
}


// ---------------------------------------------------------------------------
// BẢNG GIÁ HẠNG PHÒNG (resort / khách sạn) — cache RAM giống kho sản phẩm.
// ---------------------------------------------------------------------------
let rateCatalog: { signature: string; rates: HotelRate[] } | null = null;
let rateLoading: Promise<{ signature: string; rates: HotelRate[] }> | null = null;
let rateCheckAt = 0;

export async function getAllRates(): Promise<HotelRate[]> {
  const now = Date.now();
  if (rateCatalog && now - rateCheckAt < CHECK_EVERY_MS) return rateCatalog.rates;
  const supabase = createPublicClient();
  const { data, count, error } = await supabase
    .from("hotel_rates")
    .select("updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  rateCheckAt = Date.now();
  const signature = `${count ?? 0}|${(data?.[0] as { updated_at?: string } | undefined)?.updated_at ?? ""}`;
  if (rateCatalog && rateCatalog.signature === signature) return rateCatalog.rates;
  if (!rateLoading) {
    const total = count ?? 0;
    rateLoading = (async () => {
      const pages = Math.max(1, Math.ceil(total / PAGE));
      const res = await Promise.all(
        Array.from({ length: pages }, (_, i) =>
          supabase.from("hotel_rates").select("*").order("id").range(i * PAGE, i * PAGE + PAGE - 1)
        )
      );
      const rates: HotelRate[] = [];
      for (const r of res) {
        if (r.error) throw r.error;
        rates.push(...((r.data ?? []) as HotelRate[]));
      }
      return { signature, rates };
    })()
      .then((c) => (rateCatalog = c))
      .finally(() => (rateLoading = null));
  }
  return (await rateLoading).rates;
}
