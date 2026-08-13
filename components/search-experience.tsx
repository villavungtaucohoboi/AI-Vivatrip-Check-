"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { FilterSheet } from "@/components/filter-sheet";
import { FilterBar } from "@/components/filter-bar";
import { ProductGrid } from "@/components/product-grid";
import { ProductCard } from "@/components/product-card";
import { MotivationButton } from "@/components/motivation/motivation-button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { RankedProduct, SearchFilters, SearchResponseBody } from "@/lib/types";
import { addRecentSearch, getRecentSearches, removeRecentSearch } from "@/lib/recent-searches";
import { useClientRole } from "@/lib/use-client-role";

const PAGE_SIZE = 9;
const STORAGE_KEY = "vivatrip_search_state_v1";

const QUICK_QUERIES = [
  "Villa Phan Thiết 15 khách khoảng 10 triệu",
  "Hạ Long 5 phòng ngủ dưới 15 triệu",
];

interface SavedState {
  query: string;
  filters: SearchFilters;
  results: RankedProduct[];
  total: number;
  hasSearched: boolean;
  lastQuery: string;
  suggestedRegions: string[];
  scrollY: number;
}

function loadSavedState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

export function SearchExperience({
  areas,
  hasAnyProducts,
  isAdmin: initialIsAdmin,
}: {
  areas: string[];
  hasAnyProducts: boolean;
  isAdmin: boolean;
}) {
  const isAdmin = useClientRole(initialIsAdmin ? "admin" : "sale") === "admin";

  const saved = useRef(loadSavedState()).current;

  const [query, setQuery] = useState(saved?.query ?? "");
  const [filters, setFilters] = useState<SearchFilters>(saved?.filters ?? {});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [results, setResults] = useState<RankedProduct[]>(saved?.results ?? []);
  const [total, setTotal] = useState(saved?.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(saved?.hasSearched ?? false);
  const [lastQuery, setLastQuery] = useState(saved?.lastQuery ?? "");
  const [suggestedRegions, setSuggestedRegions] = useState<string[]>(saved?.suggestedRegions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    if (saved?.scrollY) {
      requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: Partial<SavedState>) {
    if (typeof window === "undefined") return;
    const current: SavedState = {
      query,
      filters,
      results,
      total,
      hasSearched,
      lastQuery,
      suggestedRegions,
      scrollY: window.scrollY,
      ...next,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // sessionStorage đầy hoặc bị chặn -> bỏ qua
    }
  }

  useEffect(() => {
    function onVisibilityOrUnload() {
      persist({ scrollY: window.scrollY });
    }
    window.addEventListener("pagehide", onVisibilityOrUnload);
    return () => window.removeEventListener("pagehide", onVisibilityOrUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const runSearch = useCallback(
    async (opts: { query: string; filters: SearchFilters; offset: number; append: boolean }) => {
      opts.append ? setLoadingMore(true) : setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: opts.query,
            filters: opts.filters,
            offset: opts.offset,
            limit: PAGE_SIZE,
          }),
        });

        if (!res.ok) throw new Error("Tìm kiếm thất bại");
        const data: SearchResponseBody = await res.json();

        const nextResults = opts.append ? [...results, ...data.results] : data.results;
        const nextSuggested = opts.append ? suggestedRegions : data.suggestedRegions ?? [];
        setResults(nextResults);
        setTotal(data.total);
        setLastQuery(opts.query);
        setHasSearched(true);
        setSuggestedRegions(nextSuggested);
        persist({
          query: opts.query,
          filters: opts.filters,
          results: nextResults,
          total: data.total,
          lastQuery: opts.query,
          hasSearched: true,
          suggestedRegions: nextSuggested,
          scrollY: 0,
        });
      } catch {
        setError("Có lỗi khi tìm sản phẩm. Vui lòng thử lại.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, suggestedRegions]
  );

  function handleSubmitQuery() {
    if (query.trim()) setRecentSearches(addRecentSearch(query));
    // Gõ câu tìm mới -> coi là tìm kiếm mới hoàn toàn, bỏ mọi khu vực đã
    // "mở rộng" từ lần tìm trước (tránh lẫn kết quả khu vực cũ vào).
    const freshFilters = { ...filters, expandRegions: undefined };
    setFilters(freshFilters);
    runSearch({ query, filters: freshFilters, offset: 0, append: false });
  }

  function handleApplyFilters(newFilters: SearchFilters) {
    // Bấm "Tìm" ở Bộ lọc = ý định tìm kiếm mới -> luôn bỏ khu vực mở rộng cũ,
    // dù Bộ lọc có đổi khu vực hay không (đây là nguyên nhân lỗi "tìm Sóc
    // Sơn ra cả Hòa Bình" — expandRegions từ lần bấm "Xem thêm" trước đó bị
    // giữ lại xuyên suốt các lần tìm sau).
    const cleaned = { ...newFilters, expandRegions: undefined };
    setFilters(cleaned);
    runSearch({ query, filters: cleaned, offset: 0, append: false });
  }

  function handleClearFilters() {
    setFilters({});
    runSearch({ query, filters: {}, offset: 0, append: false });
  }

  function handleLoadMore() {
    runSearch({ query, filters, offset: results.length, append: true });
  }

  function handleExpandRegion(region: string) {
    const nextFilters = { ...filters, expandRegions: [...(filters.expandRegions ?? []), region] };
    setFilters(nextFilters);
    runSearch({ query, filters: nextFilters, offset: 0, append: false });
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;
  const hasRealCriteria = !!lastQuery.trim() || Object.keys(filters).length > 0;

  if (!hasAnyProducts) {
    return (
      <EmptyState
        title="Chưa có sản phẩm"
        description={
          isAdmin
            ? "Thêm sản phẩm đầu tiên để bắt đầu."
            : "Kho sản phẩm đang trống. Liên hệ Admin để thêm sản phẩm."
        }
      >
        {isAdmin && (
          <Link href="/admin/products/new">
            <Button className="mt-4">
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </Link>
        )}
      </EmptyState>
    );
  }

  const showTop3 = hasRealCriteria && results.length > 0;
  const top3 = showTop3 ? results.slice(0, 3) : [];
  const rest = showTop3 ? results.slice(3) : results;
  const regionLabel = filters.area ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Tìm sản phẩm phù hợp</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          Nhập nhu cầu khách hoặc sử dụng bộ lọc
        </p>
      </div>

      <MotivationButton />

      <div className="space-y-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmitQuery}
          onOpenFilters={() => setFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
        />
        <FilterBar areas={areas} value={filters} onApply={handleApplyFilters} />

        {!hasSearched && (
          <div className="flex flex-wrap items-center gap-1.5">
            {recentSearches.length > 0 && (
              <span className="text-[11px] font-medium text-ink-muted">Tìm gần đây:</span>
            )}
            {(recentSearches.length > 0 ? recentSearches : QUICK_QUERIES).map((q) => (
              <span
                key={q}
                className="group inline-flex items-center gap-1 rounded-full border border-border bg-white pl-3 pr-1.5 py-1 text-[11.5px] text-ink-muted hover:bg-paper-dim hover:text-ink"
              >
                <button
                  onClick={() => {
                    setQuery(q);
                    setRecentSearches(addRecentSearch(q));
                    runSearch({ query: q, filters: { ...filters, expandRegions: undefined }, offset: 0, append: false });
                  }}
                >
                  {q}
                </button>
                {recentSearches.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecentSearches(removeRecentSearch(q));
                    }}
                    className="rounded-full p-0.5 text-ink-muted/60 hover:text-danger"
                    aria-label="Xóa"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        areas={areas}
        value={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {loading && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/10] sm:aspect-square" />
          ))}
        </div>
      )}

      {!loading && error && <EmptyState title="Không tìm được" description={error} />}

      {!loading && !error && hasSearched && results.length === 0 && (
        <div className="space-y-4">
          <EmptyState
            title={regionLabel ? `Chưa tìm thấy căn phù hợp tại ${regionLabel}.` : "Không có sản phẩm phù hợp"}
            description="Thử đổi từ khóa hoặc nới rộng bộ lọc để xem thêm lựa chọn."
          />
          {suggestedRegions.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center">
              <p className="mb-3 text-[13px] text-ink-muted">Bạn có muốn mở rộng sang khu vực khác?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedRegions.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleExpandRegion(r)}
                    className="rounded-full border border-teal/40 bg-teal-light px-3.5 py-1.5 text-[12.5px] font-medium text-teal-dark hover:bg-teal-light/70"
                  >
                    Xem thêm {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !hasSearched && results.length === 0 && (
        <EmptyState
          title="Nhập nhu cầu khách hàng để bắt đầu"
          description='VD: "Villa Phan Thiết 15 khách khoảng 10 triệu", hoặc dùng bộ lọc.'
        />
      )}

      {!loading && results.length > 0 && (
        <>
          {showTop3 && top3.length > 0 && (
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                <Sparkles className="h-4 w-4 text-sand" />
                {top3.length === 3 ? "3 căn phù hợp nhất" : `${top3.length} căn phù hợp nhất`}
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
                {top3.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    rank={(i + 1) as 1 | 2 | 3}
                    matchLabel={i === 0 ? "Phù hợp nhất" : `Lựa chọn ${i + 1}`}
                    reason={product._reason}
                  />
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {showTop3 && (
                <p className="mb-2.5 text-[13.5px] font-bold text-ink">
                  {regionLabel ? `Các căn khác tại ${regionLabel}` : "Các sản phẩm khác"}
                </p>
              )}
              <p className="mb-2.5 text-[13px] text-ink-muted">
                Đang hiển thị {results.length} / {total} sản phẩm phù hợp nhất
              </p>
              <ProductGrid products={rest} />
            </div>
          )}

          {results.length < total && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Xem thêm sản phẩm
              </Button>
            </div>
          )}

          {suggestedRegions.length > 0 && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center">
              <p className="mb-3 text-[13px] text-ink-muted">
                Muốn xem thêm khu vực tương tự {regionLabel}?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedRegions.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleExpandRegion(r)}
                    className="rounded-full border border-teal/40 bg-teal-light px-3.5 py-1.5 text-[12.5px] font-medium text-teal-dark hover:bg-teal-light/70"
                  >
                    Xem thêm {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
