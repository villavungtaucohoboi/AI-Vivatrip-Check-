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
// GIỮ KẾT QUẢ TÌM KIẾM khi vào xem 1 khách sạn rồi bấm Quay lại (giữ câu tìm, bộ lọc, danh sách, vị trí cuộn)
const STORAGE_KEY = "vivatrip-resort-search-v1";
const KEEP_MS = 6 * 3600e3;
interface Saved {
  at: number;
  query: string;
  typeChip: ProductType | "";
  area: string;
  checkin: string;
  checkout: string;
  guests: string;
  budget: string;
  star: number;
  showFilters: boolean;
  data: ResortSearchResponse | null;
  results: ResortResult[];
  scrollY: number;
}
function loadSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && Date.now() - s.at < KEEP_MS ? s : null;
  } catch {
    return null;
  }
}
const QUICK = ["Khách sạn Hạ Long phòng 2 người tầm 1tr2/đêm 10-12/11", "Resort Đại Lải 4 khách cuối tuần"];

export function ResortSearchExperience({ areas }: { areas: string[] }) {
  const [query, setQuery] = useState("");
  const [typeChip, setTypeChip] = useState<ProductType | "">("");
  const [area, setArea] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [star, setStar] = useState(0);
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
        ...(star ? { star } : {}),
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
    [query, typeChip, area, checkin, checkout, guests, budget, star, results.length]
  );

  // Mở trang: có kết quả cũ (vừa bấm Quay lại) → hiện lại y nguyên + cuộn về chỗ cũ;
  // chưa có → hiện luôn danh sách (rẻ → đắt), không phải gõ mới thấy
  const didInit = useRef(false);
  const restored = useRef(false);
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const sv = loadSaved();
    if (sv?.data) {
      restored.current = true;
      setQuery(sv.query);
      setTypeChip(sv.typeChip);
      setArea(sv.area);
      setCheckin(sv.checkin);
      setCheckout(sv.checkout);
      setGuests(sv.guests);
      setBudget(sv.budget);
      setStar(sv.star);
      setShowFilters(sv.showFilters);
      setData(sv.data);
      setResults(sv.results);
      scrollYRef.current = sv.scrollY;
      // đợi danh sách vẽ xong rồi mới cuộn
      let n = 0;
      const tick = () => {
        if (document.body.scrollHeight >= sv.scrollY + window.innerHeight * 0.5 || n++ > 30) window.scrollTo({ top: sv.scrollY, behavior: "instant" as ScrollBehavior });
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      return;
    }
    runSearch();
  }, [runSearch]);

  // Lưu lại mỗi khi kết quả / bộ lọc thay đổi
  useEffect(() => {
    if (!didInit.current || !data) return;
    try {
      const sv: Saved = { at: Date.now(), query, typeChip, area, checkin, checkout, guests, budget, star, showFilters, data, results, scrollY: scrollYRef.current };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sv));
    } catch {
      /* bộ nhớ trình duyệt đầy / bị chặn → bỏ qua */
    }
  }, [query, typeChip, area, checkin, checkout, guests, budget, star, showFilters, data, results]);

  // Nhớ vị trí cuộn (để quay lại đúng chỗ đang xem)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let leaving = false;
    const save = (y: number) => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...(JSON.parse(raw) as Saved), scrollY: y, at: Date.now() }));
      } catch {
        /* bỏ qua */
      }
    };
    // Bấm vào 1 khách sạn → chốt vị trí cuộn NGAY (trang mới sẽ tự cuộn lên đầu, không được ghi đè)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href")?.startsWith("/")) {
        leaving = true;
        scrollYRef.current = window.scrollY;
        save(window.scrollY);
      }
    };
    document.addEventListener("click", onClick, true);
    const onScroll = () => {
      if (leaving) return;
      scrollYRef.current = window.scrollY;
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const sv = JSON.parse(raw) as Saved;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sv, scrollY: scrollYRef.current, at: Date.now() }));
        } catch {
          /* bỏ qua */
        }
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      if (!leaving) save(scrollYRef.current);
    };
  }, []);

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
        {(["", "resort", "hotel", "homestay"] as const).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setTypeChip(t)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold ${typeChip === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"}`}
          >
            {t === "" ? "Tất cả" : t === "resort" ? "Resort" : t === "hotel" ? "Khách sạn" : "Homestay"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-bold text-ink-muted">Hạng sao:</span>
        {[0, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStar(s)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${star === s ? "bg-amber-500 text-white" : "border border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            {s === 0 ? "Tất cả" : `${s}★ trở lên`}
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

      {pf && (pf.area || pf.date || pf.guests || pf.budget || pf.star) && (
        <div className="flex flex-wrap gap-1.5 text-[12px]">
          <span className="font-semibold text-ink-muted">App hiểu:</span>
          {pf.area && <span className="rounded-full bg-teal-light px-2.5 py-1 font-semibold text-teal-dark">📍 {pf.area}</span>}
          {pf.star && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{pf.star}★ trở lên</span>}
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
