"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { FilterSheet } from "@/components/filter-sheet";
import { FilterBar } from "@/components/filter-bar";
import { ProductGrid } from "@/components/product-grid";
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

  // Khôi phục lại đúng lần tìm kiếm gần nhất (nếu có) ngay từ lần render đầu
  // tiên — để bấm vào 1 sản phẩm rồi quay lại không bị mất kết quả đang xem.
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
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Khôi phục vị trí cuộn sau khi nội dung đã render lại đầy đủ
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
      scrollY: window.scrollY,
      ...next,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // sessionStorage đầy hoặc bị chặn -> bỏ qua, không ảnh hưởng chức năng tìm kiếm
    }
  }

  // Lưu lại vị trí cuộn ngay trước khi rời trang (bấm vào 1 sản phẩm)
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
        setResults(nextResults);
        setTotal(data.total);
        setLastQuery(opts.query);
        setHasSearched(true);
        persist({
          query: opts.query,
          filters: opts.filters,
          results: nextResults,
          total: data.total,
          lastQuery: opts.query,
          hasSearched: true,
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
    [results]
  );

  function handleSubmitQuery() {
    if (query.trim()) setRecentSearches(addRecentSearch(query));
    runSearch({ query, filters, offset: 0, append: false });
  }

  function handleApplyFilters(newFilters: SearchFilters) {
    setFilters(newFilters);
    runSearch({ query, filters: newFilters, offset: 0, append: false });
  }

  function handleClearFilters() {
    setFilters({});
    runSearch({ query, filters: {}, offset: 0, append: false });
  }

  function handleLoadMore() {
    runSearch({ query, filters, offset: results.length, append: true });
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Tìm sản phẩm phù hợp</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-muted">
          Nhập nhu cầu khách hoặc sử dụng bộ lọc
        </p>
      </div>

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
                    runSearch({ query: q, filters, offset: 0, append: false });
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
        <EmptyState
          title="Không có sản phẩm phù hợp"
          description="Thử đổi từ khóa hoặc nới rộng bộ lọc để xem thêm lựa chọn."
        />
      )}

      {!loading && !error && !hasSearched && results.length === 0 && (
        <EmptyState
          title="Nhập nhu cầu khách hàng để bắt đầu"
          description='VD: "Villa Phan Thiết 15 khách khoảng 10 triệu", hoặc dùng bộ lọc.'
        />
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-[13px] text-ink-muted">
            Đang hiển thị {results.length} / {total} sản phẩm phù hợp nhất
          </p>
          <ProductGrid products={results} showBestMatch={!!lastQuery.trim()} />

          {results.length < total && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Xem thêm sản phẩm
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
