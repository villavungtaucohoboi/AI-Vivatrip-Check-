import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public-client";
import { parseQuery } from "@/lib/query-parser";
import { applyExplicitFilters, rankProducts } from "@/lib/ranking";
import type { Holiday, Product, SearchRequestBody, SearchResponseBody } from "@/lib/types";

// Đa số lượt tìm kiếm chỉ gõ câu tự nhiên, không dùng Bộ lọc thủ công — với
// trường hợp đó, danh sách sản phẩm gốc (trước khi xếp hạng) không cần lọc
// SQL theo điều kiện riêng của từng request, nên cache ngắn 15 giây để không
// phải tải lại toàn bộ kho mỗi lần tìm. Khi Admin sửa sản phẩm, cache này
// được phá ngay qua revalidateTag("products") — xem app/api/admin/products/.
const getCachedAllProducts = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    return supabase.from("products").select("*").limit(2000);
  },
  ["search-all-products"],
  { revalidate: 15, tags: ["products"] }
);

const getCachedHolidays = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("holidays").select("*");
    return (data ?? []) as Holiday[];
  },
  ["search-holidays"],
  { revalidate: 60, tags: ["holidays"] }
);

const getCachedAreas = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("get_distinct_areas");
    return ((data ?? []) as { area: string }[]).map((r) => r.area);
  },
  ["search-areas"],
  { revalidate: 60, tags: ["products"] }
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const body: SearchRequestBody = await req.json();
  const query = body.query?.trim() ?? "";
  const explicitFilters = body.filters ?? {};
  const offset = body.offset ?? 0;
  const limit = Math.min(body.limit ?? 10, 50);
  const hasExplicitFilters = Object.keys(explicitFilters).length > 0;

  // Danh sách khu vực thật trong DB, để parser nhận diện chính xác
  const knownAreas = await getCachedAreas();

  const parsedFromQuery = query ? parseQuery(query, knownAreas) : {};

  // Bộ lọc thủ công (nếu có) luôn được ưu tiên hơn kết quả suy đoán từ câu chữ
  const mergedFilters = { ...parsedFromQuery, ...explicitFilters };

  // Ngày lễ — cần để xác định đúng khung giá villa/resort (Thứ 7 & Ngày lễ)
  const holidays = await getCachedHolidays();

  // CHỈ áp dụng lọc cứng (WHERE) cho những điều kiện sale chọn thủ công qua
  // "Bộ lọc" — còn nhu cầu gõ bằng câu tự nhiên chỉ dùng để XẾP HẠNG, để
  // luôn trả ra ~10 sản phẩm gần đúng nhất thay vì màn hình trống khi
  // không có sản phẩm khớp 100%.
  // Khi có "Ngày đi", cột `price` không phản ánh đúng giá villa/resort ngày đó
  // (giá đó phụ thuộc khung thứ/lễ) — bỏ lọc giá ở SQL, lọc chính xác lại
  // bằng JS bên dưới sau khi đã resolve giá theo đúng ngày.
  const hasDate = !!mergedFilters.date;
  const sqlFilters = hasDate ? { ...explicitFilters, priceFrom: undefined, priceTo: undefined } : explicitFilters;

  let data: Product[] | null;
  let error: { message: string } | null;

  if (hasExplicitFilters) {
    // Có điều kiện lọc riêng theo request -> cần SQL chính xác, không dùng cache chung.
    let dbQuery = supabase.from("products").select("*").limit(2000);
    dbQuery = applyExplicitFilters(dbQuery, sqlFilters);
    const result = await dbQuery;
    data = result.data as Product[] | null;
    error = result.error;
  } else {
    const result = await getCachedAllProducts();
    data = result.data as Product[] | null;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let ranked = rankProducts((data ?? []) as Product[], mergedFilters, holidays);

  if (hasDate && (explicitFilters.priceFrom != null || explicitFilters.priceTo != null)) {
    const from = explicitFilters.priceFrom ?? 0;
    const to = explicitFilters.priceTo ?? Infinity;
    ranked = ranked.filter((p) => {
      const price = p._pricing ? p._pricing.finalPrice : p.price;
      return price != null && price >= from && price <= to;
    });
  }

  const page = ranked.slice(offset, offset + limit);

  const responseBody: SearchResponseBody = {
    results: page,
    total: ranked.length,
    parsedFilters: mergedFilters,
  };

  return NextResponse.json(responseBody);
}
