"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { FilterSheet } from "@/components/filter-sheet";
import { FilterBar } from "@/components/filter-bar";
import { ProductGrid } from "@/components/product-grid";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { RankedProduct, SearchFilters, SearchResponseBody } from "@/lib/types";

const PAGE_SIZE = 9;

const QUICK_QUERIES = [
  "Villa Phan Thiết 15 khách khoảng 10 triệu",
  "Hạ Long 5 phòng ngủ dưới 15 triệu",
];

export function SearchExperience({
  areas,
  hasAnyProducts,
  isAdmin,
}: {
  areas: string[];
  hasAnyProducts: boolean;
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [results, setResults] = useState<RankedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

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

        setResults((prev) => (opts.append ? [...prev, ...data.results] : data.results));
        setTotal(data.total);
        setLastQuery(opts.query);
      } catch {
        setError("Có lỗi khi tìm sản phẩm. Vui lòng thử lại.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setHasSearched(true);
      }
    },
    []
  );

  function handleSubmitQuery() {
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
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  runSearch({ query: q, filters, offset: 0, append: false });
                }}
                className="rounded-full border border-border bg-white px-3 py-1 text-[11.5px] text-ink-muted hover:bg-paper-dim hover:text-ink"
              >
                {q}
              </button>
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
