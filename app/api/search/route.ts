import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public-client";
import { parseQuery } from "@/lib/query-parser";
import { rankProducts, normalize } from "@/lib/ranking";
import type { Holiday, Product, SearchRequestBody, SearchResponseBody } from "@/lib/types";

// Cache ngắn 15s cho toàn bộ kho sản phẩm — mọi lượt tìm kiếm (dù gõ chữ hay
// dùng Bộ lọc) đều đi qua CÙNG 1 danh sách gốc rồi lọc/xếp hạng bằng JS ở
// dưới, để đảm bảo 2 cách tìm luôn cho cùng 1 kết quả (yêu cầu bắt buộc).
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

const getCachedSubRegionsForArea = unstable_cache(
  async (area: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("get_sub_regions_for_area", { p_area: area });
    return ((data ?? []) as { sub_region: string }[]).map((r) => r.sub_region);
  },
  ["search-subregions"],
  { revalidate: 60, tags: ["products"] }
);

// Khi tìm bằng câu tự nhiên (chưa biết khu vực nào), thử gom tiểu khu vực
// của MỌI khu vực có tên xuất hiện trong câu, để parser nhận diện được câu
// kiểu "Đồng Đò Sóc Sơn" mà không cần Sale chọn khu vực trước.
async function subRegionsMentionedInQuery(areas: string[], query: string): Promise<string[]> {
  const norm = normalize(query);
  const candidateAreas = areas.filter((a) => norm.includes(normalize(a))).slice(0, 3);
  if (candidateAreas.length === 0) return [];
  const lists = await Promise.all(candidateAreas.map((a) => getCachedSubRegionsForArea(a)));
  return lists.flat();
}

export async function POST(req: NextRequest) {
  const body: SearchRequestBody = await req.json();
  const query = body.query?.trim() ?? "";
  const explicitFilters = body.filters ?? {};
  const offset = body.offset ?? 0;
  const limit = Math.min(body.limit ?? 10, 50);

  const knownAreas = await getCachedAreas();
  const knownSubRegions = explicitFilters.area
    ? await getCachedSubRegionsForArea(explicitFilters.area)
    : query
    ? await subRegionsMentionedInQuery(knownAreas, query)
    : [];

  const parsedFromQuery = query ? parseQuery(query, knownAreas, knownSubRegions) : {};

  // Bộ lọc thủ công (nếu có) luôn ưu tiên hơn kết quả suy đoán từ câu chữ —
  // nhưng CÙNG đi qua applyHardFilters/rankProducts như câu tự nhiên, không
  // có 2 pipeline khác nhau (yêu cầu bắt buộc: NL và Filter UI dùng chung engine).
  const mergedFilters = { ...parsedFromQuery, ...explicitFilters };

  const holidays = await getCachedHolidays();
  const { data, error } = await getCachedAllProducts();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ranked = rankProducts((data ?? []) as Product[], mergedFilters, holidays);

  // Gợi ý mở rộng khu vực — CHỈ hiện tên khu vực lân cận để Sale chủ động
  // bấm, không tự trộn kết quả. Không áp dụng khi Sale đã tự bấm mở rộng rồi.
  let suggestedRegions: string[] | undefined;
  if (mergedFilters.area && mergedFilters.areaCluster && !mergedFilters.expandRegions?.length) {
    const current = normalize(mergedFilters.area);
    suggestedRegions = mergedFilters.areaCluster.filter((a) => normalize(a) !== current);
  }

  const page = ranked.slice(offset, offset + limit);

  const responseBody: SearchResponseBody = {
    results: page,
    total: ranked.length,
    parsedFilters: mergedFilters,
    suggestedRegions,
  };

  return NextResponse.json(responseBody);
}
