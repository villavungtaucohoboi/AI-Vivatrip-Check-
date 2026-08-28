"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { ResortProductCard } from "@/components/resort-product-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ProductType, RankedProduct, SearchFilters, SearchResponseBody } from "@/lib/types";

const PAGE_SIZE = 9;
const RESORT_TYPES: ProductType[] = ["hotel", "resort"];

export function ResortSearchExperience({ areas }: { areas: string[] }) {
  const [query, setQuery] = useState("");
  const [typeChip, setTypeChip] = useState<ProductType | "">("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  const [results, setResults] = useState<RankedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const runSearch = useCallback(
    async (opts: { append?: boolean } = {}) => {
      opts.append ? setLoadingMore(true) : setLoading(true);

      const filters: SearchFilters = {
        types: RESORT_TYPES,
        ...(typeChip ? { type: typeChip } : {}),
        ...(area ? { area } : {}),
        ...(date ? { date } : {}),
        ...(priceFrom ? { priceFrom: Number(priceFrom) } : {}),
        ...(priceTo ? { priceTo: Number(priceTo) } : {}),
      };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          filters,
          offset: opts.append ? results.length : 0,
          limit: PAGE_SIZE,
        }),
      });
      const data: SearchResponseBody = await res.json();

      setResults((prev) => (opts.append ? [...prev, ...data.results] : data.results));
      setTotal(data.total);
      setHasSearched(true);
      opts.append ? setLoadingMore(false) : setLoading(false);
    },
    [query, typeChip, area, date, priceFrom, priceTo, results.length]
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-ink sm:text-3xl">Tìm Resort / Hotel</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Trang tìm kiếm riêng cho Resort &amp; Khách sạn — tách biệt hoàn toàn khỏi Villa.
      </p>

      <div className="mt-5">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => runSearch()}
          onOpenFilters={() => {}}
          activeFilterCount={0}
        />
      </div>

      <div className="mt-3 flex gap-1.5">
        {(["", "resort", "hotel"] as const).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setTypeChip(t)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${
              typeChip === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"
            }`}
          >
            {t === "" ? "Tất cả" : t === "resort" ? "Resort" : "Khách sạn"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-40">
          <option value="">Khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Input
          type="number"
          placeholder="Giá từ"
          value={priceFrom}
          onChange={(e) => setPriceFrom(e.target.value)}
          className="w-32"
        />
        <Input
          type="number"
          placeholder="Giá đến"
          value={priceTo}
          onChange={(e) => setPriceTo(e.target.value)}
          className="w-32"
        />
        <Button onClick={() => runSearch()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
        </Button>
      </div>

      <div className="mt-6">
        {loading && !hasSearched ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] rounded-card" />
            ))}
          </div>
        ) : !hasSearched ? (
          <EmptyState
            title="Nhập nhu cầu để bắt đầu"
            description='VD: "Resort Nha Trang 4 khách", hoặc dùng bộ lọc phía trên.'
          />
        ) : results.length === 0 ? (
          <EmptyState title="Không tìm thấy kết quả phù hợp" description="Thử đổi khu vực hoặc bỏ bớt bộ lọc." />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-muted">Đang hiển thị {results.length} / {total} kết quả</p>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
              {results.map((product) => (
                <ResortProductCard key={product.id} product={product} />
              ))}
            </div>
            {results.length < total && (
              <div className="mt-5 text-center">
                <Button variant="outline" onClick={() => runSearch({ append: true })} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xem thêm"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
