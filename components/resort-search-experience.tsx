"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { NameQuickSearch } from "@/components/name-quick-search";
import { ResortGridCard } from "@/components/resort/resort-grid-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDateVN } from "@/lib/pricing";
import type { ProductType, SearchFilters } from "@/lib/types";
import type { ResortResult, ResortSearchResponse } from "@/app/api/search-resort/route";

const PAGE_SIZE = 10;
const QUICK = ["Khách sạn Hạ Long phòng 2 người tầm 1tr2/đêm 10-12/11", "Resort Đại Lải 4 khách cuối tuần"];

export function ResortSearchExperience({ areas }: { areas: string[] }) {
  const [query, setQuery] = useState("");
  const [typeChip, setTypeChip] = useState<ProductType | "">("");
  const [area, setArea] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [data, setData] = useState<ResortSearchResponse | null>(null);
  const [results, setResults] = useState<ResortResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const runSearch = useCallback(
    async (opts: { append?: boolean; q?: string } = {}) => {
      opts.append ? setLoadingMore(true) : setLoading(true);
      const filters: SearchFilters = {
        ...(typeChip ? { type: typeChip } : {}),
        ...(area ? { area } : {}),
        ...(checkin ? { date: checkin } : {}),
        ...(checkout ? { checkout } : {}),
        ...(guests ? { guests: Number(guests) } : {}),
        ...(budget ? { budget: Number(budget.replace(/\D/g, "")) } : {}),
      };
      try {
        const res = await fetch("/api/search-resort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: opts.q ?? query, filters, offset: opts.append ? results.length : 0, limit: PAGE_SIZE }),
        });
        const d: ResortSearchResponse = await res.json();
        setData(d);
        setResults((prev) => (opts.append ? [...prev, ...d.results] : d.results));
      } finally {
        opts.append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [query, typeChip, area, checkin, checkout, guests, budget, results.length]
  );

  // Mở trang là hiện luôn danh sách (rẻ → đắt), không phải gõ mới thấy
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    runSearch();
  }, [runSearch]);

  const pf = data?.parsedFilters;
  const fit = results.filter((r) => r.group !== "above");
  const above = results.filter((r) => r.group === "above");

  const card = (r: ResortResult, i: number, label?: string) => (
    <ResortGridCard
      key={r.product.id}
      result={r}
      nights={data?.nights ?? 1}
      checkin={pf?.date}
      checkout={pf?.checkout}
      label={label ?? (i === 0 && pf?.budget ? "Hợp nhất" : undefined)}
    />
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Tìm Resort / Khách sạn</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">Gõ tên, hoặc nhu cầu khách: khu vực · số người/phòng · ngân sách/đêm · ngày ở.</p>
      </div>

      <NameQuickSearch scope="resort" placeholder="Tìm nhanh theo tên resort / khách sạn…" />

      <SearchBar value={query} onChange={setQuery} onSubmit={() => runSearch()} onOpenFilters={() => setShowFilters((v) => !v)}
        placeholder="VD: Khách sạn Hạ Long 2 người 1tr2/đêm 10-12/11"
        activeFilterCount={[typeChip, area, checkin, checkout, guests, budget].filter(Boolean).length}
      />
      {!data && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                runSearch({ q });
              }}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-[12px] text-ink-muted"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
      <div className="space-y-2.5 rounded-2xl border border-border bg-white p-3">
      <div className="flex flex-wrap gap-1.5">
        {(["", "resort", "hotel"] as const).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setTypeChip(t)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${typeChip === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"}`}
          >
            {t === "" ? "Tất cả" : t === "resort" ? "Resort" : "Khách sạn"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Select value={area} onChange={(e) => setArea(e.target.value)} className="sm:w-40">
          <option value="">Khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Input type="number" min={1} placeholder="Khách/phòng" value={guests} onChange={(e) => setGuests(e.target.value)} className="sm:w-32" />
        <label className="relative">
          <span className="pointer-events-none absolute -top-2 left-2 bg-paper px-1 text-[10px] font-semibold text-ink-muted">Nhận phòng</span>
          <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="sm:w-40" />
        </label>
        <label className="relative">
          <span className="pointer-events-none absolute -top-2 left-2 bg-paper px-1 text-[10px] font-semibold text-ink-muted">Trả phòng</span>
          <Input type="date" value={checkout} min={checkin || undefined} onChange={(e) => setCheckout(e.target.value)} className="sm:w-40" />
        </label>
        <Input inputMode="numeric" placeholder="Ngân sách/đêm (VD 1200000)" value={budget} onChange={(e) => setBudget(e.target.value)} className="col-span-2 sm:w-56" />
        <Button onClick={() => runSearch()} disabled={loading} className="col-span-2 sm:col-span-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
        </Button>
      </div>
      </div>
      )}

      {pf && (pf.area || pf.date || pf.guests || pf.budget) && (
        <div className="flex flex-wrap gap-1.5 text-[12px]">
          <span className="font-semibold text-ink-muted">App hiểu:</span>
          {pf.area && <span className="rounded-full bg-teal-light px-2.5 py-1 font-semibold text-teal-dark">📍 {pf.area}</span>}
          {pf.guests && <span className="rounded-full bg-teal-light px-2.5 py-1 font-semibold text-teal-dark">👥 {pf.guests} người/phòng</span>}
          {pf.budget && (
            <span className="rounded-full bg-teal-light px-2.5 py-1 font-semibold text-teal-dark">
              💰 khoảng {new Intl.NumberFormat("vi-VN").format(pf.budget)}đ/đêm
            </span>
          )}
          {pf.date && (
            <span className="rounded-full bg-teal-light px-2.5 py-1 font-semibold text-teal-dark">
              📅 {formatDateVN(pf.date).slice(0, 5)}
              {pf.checkout ? ` → ${formatDateVN(pf.checkout).slice(0, 5)} (${data?.nights} đêm)` : ""}
            </span>
          )}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-card" />
          ))}
        </div>
      ) : !data ? (
        <EmptyState title="Nhập nhu cầu để bắt đầu" description='VD: "Khách sạn Hạ Long phòng 2 người tầm 1tr2/đêm 10-12/11"' />
      ) : results.length === 0 ? (
        <EmptyState title="Không tìm thấy kết quả phù hợp" description="Thử đổi khu vực, bỏ bớt điều kiện hoặc tăng ngân sách." />
      ) : (
        <div className="space-y-5">
          {fit.length > 0 && (
            <section>
              {pf?.budget ? (
                <p className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-ink">
                  <Sparkles className="h-4 w-4 text-sand" /> {data.fitCount} nơi vừa ngân sách
                </p>
              ) : (
                <p className="mb-2 text-[13px] text-ink-muted">
                  {data.total} kết quả · sắp xếp theo giá
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">{fit.map((r, i) => card(r, i))}</div>
            </section>
          )}
          {above.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-ink">
                <TrendingUp className="h-4 w-4 text-teal" /> Cao hơn ngân sách một chút
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">{above.map((r, i) => card(r, i, "Cao hơn"))}</div>
            </section>
          )}
          {results.length < data.total && (
            <div className="text-center">
              <Button variant="outline" onClick={() => runSearch({ append: true })} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xem thêm"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
