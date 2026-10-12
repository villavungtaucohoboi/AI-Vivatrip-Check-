import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public-client";
import { parseQuery } from "@/lib/query-parser";
import { rankProducts, normalize } from "@/lib/ranking";
import type { Holiday, Product, SearchRequestBody, SearchResponseBody } from "@/lib/types";

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

async function getAllProducts(): Promise<Product[]> {
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

// Giá phòng: chỉ lấy cho đúng các sản phẩm hotel/resort đang hiển thị
// (thay vì tải cả bảng, có giới hạn 5000 dòng như trước) → luôn mới, luôn đủ.
async function getHotelRatesFor(productIds: string[]) {
  if (productIds.length === 0) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("hotel_rates")
    .select("*")
    .in("product_id", productIds)
    .order("price");
  return data ?? [];
}

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
  try {
    return await handleSearch(req);
  } catch (e) {
    const message = (e as { message?: string })?.message ?? "Lỗi tìm kiếm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleSearch(req: NextRequest) {
  const body: SearchRequestBody = await req.json();
  const query = body.query?.trim() ?? "";
  const explicitFilters = body.filters ?? {};
  const offset = body.offset ?? 0;
  const limit = Math.min(body.limit ?? 10, 50);

  // Chạy song song mọi truy vấn độc lập (trước đây chạy nối tiếp từng cái).
  const [knownAreas, holidays, allProducts] = await Promise.all([
    getCachedAreas(),
    getCachedHolidays(),
    getAllProducts(),
  ]);
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

  // Nếu trang đã khoá cứng phạm vi loại (VD trang Resort/Hotel khoá types),
  // mà câu chữ tự do lại đoán ra 1 loại KHÔNG nằm trong phạm vi đó (VD gõ
  // "villa" trên trang Resort) — bỏ phần đoán sai đó đi, không để ra 0 kết
  // quả một cách khó hiểu.
  if (mergedFilters.types?.length && mergedFilters.type && !mergedFilters.types.includes(mergedFilters.type)) {
    delete mergedFilters.type;
  }

  const ranked = rankProducts(allProducts, mergedFilters, holidays);

  // Gợi ý mở rộng khu vực — CHỈ hiện tên khu vực lân cận để Sale chủ động
  // bấm, không tự trộn kết quả. Không áp dụng khi Sale đã tự bấm mở rộng rồi.
  let suggestedRegions: string[] | undefined;
  if (mergedFilters.area && mergedFilters.areaCluster && !mergedFilters.expandRegions?.length) {
    const current = normalize(mergedFilters.area);
    suggestedRegions = mergedFilters.areaCluster.filter((a) => normalize(a) !== current);
  }

  // Sao chép từng sản phẩm để không sửa vào bản đang cache trong RAM.
  let page = ranked.slice(offset, offset + limit).map((p) => ({ ...p }));

  // Gắn kèm hạng phòng cho các sản phẩm hotel/resort trong trang kết quả.
  const nonVillaIds = page.filter((p) => p.type !== "villa").map((p) => p.id);
  if (nonVillaIds.length > 0) {
    const rates = await getHotelRatesFor(nonVillaIds);
    const ratesByProduct = new Map<string, typeof rates>();
    for (const rate of rates) {
      const list = ratesByProduct.get(rate.product_id) ?? [];
      list.push(rate);
      ratesByProduct.set(rate.product_id, list);
    }
    page = page.map((p) =>
      p.type !== "villa" ? { ...p, hotel_rates: ratesByProduct.get(p.id) ?? [] } : p
    );
  }

  const responseBody: SearchResponseBody = {
    results: page,
    total: ranked.length,
    parsedFilters: mergedFilters,
    suggestedRegions,
  };

  return NextResponse.json(responseBody);
}
