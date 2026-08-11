import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/query-parser";
import { applyExplicitFilters, rankProducts } from "@/lib/ranking";
import type { Holiday, Product, SearchRequestBody, SearchResponseBody } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body: SearchRequestBody = await req.json();
  const query = body.query?.trim() ?? "";
  const explicitFilters = body.filters ?? {};
  const offset = body.offset ?? 0;
  const limit = Math.min(body.limit ?? 10, 50);

  // Danh sách khu vực thật trong DB, để parser nhận diện chính xác
  const { data: areaRows } = await supabase.from("products").select("area");
  const knownAreas = Array.from(new Set((areaRows ?? []).map((r) => r.area)));

  const parsedFromQuery = query ? parseQuery(query, knownAreas) : {};

  // Bộ lọc thủ công (nếu có) luôn được ưu tiên hơn kết quả suy đoán từ câu chữ
  const mergedFilters = { ...parsedFromQuery, ...explicitFilters };

  // Ngày lễ — cần để xác định đúng khung giá villa/resort (Thứ 7 & Ngày lễ)
  const { data: holidays } = await supabase.from("holidays").select("*");

  // CHỈ áp dụng lọc cứng (WHERE) cho những điều kiện sale chọn thủ công qua
  // "Bộ lọc" — còn nhu cầu gõ bằng câu tự nhiên chỉ dùng để XẾP HẠNG, để
  // luôn trả ra ~10 sản phẩm gần đúng nhất thay vì màn hình trống khi
  // không có sản phẩm khớp 100%.
  // Khi có "Ngày đi", cột `price` không phản ánh đúng giá villa/resort ngày đó
  // (giá đó phụ thuộc khung thứ/lễ) — bỏ lọc giá ở SQL, lọc chính xác lại
  // bằng JS bên dưới sau khi đã resolve giá theo đúng ngày.
  const hasDate = !!mergedFilters.date;
  const sqlFilters = hasDate ? { ...explicitFilters, priceFrom: undefined, priceTo: undefined } : explicitFilters;

  let dbQuery = supabase.from("products").select("*").limit(2000);
  dbQuery = applyExplicitFilters(dbQuery, sqlFilters);

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let ranked = rankProducts((data ?? []) as Product[], mergedFilters, (holidays ?? []) as Holiday[]);

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
