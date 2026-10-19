"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { formatVNDShort } from "@/lib/format";
import { PRODUCT_TYPE_LABEL, type ProductType } from "@/lib/types";

interface NameHit {
  id: string;
  product_name: string;
  type: ProductType;
  area: string;
  sub_region: string | null;
  thumbnail_url: string | null;
  price_weekday: number | null;
  /** cùng khách sạn ở nhiều đối tác (rẻ → đắt) */
  partners?: string[];
}

/**
 * Ô "Tìm theo tên căn" — gõ tới đâu gợi ý tới đó, bấm là mở thẳng trang chi
 * tiết. Tách riêng khỏi ô tìm theo nhu cầu để Sale biết tên căn là ra ngay.
 */
export function NameQuickSearch({ scope, placeholder }: { scope: "villa" | "resort"; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<NameHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/names?type=${scope}&q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results: NameHit[] };
        setHits(data.results ?? []);
        setOpen(true);
      } catch {
        // bị huỷ do gõ tiếp — bỏ qua
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, scope]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Tìm nhanh theo tên căn… (VD: Đại Dương, Nhà Sáng)"}
          className="h-11 w-full rounded-xl border border-teal/30 bg-teal-light/40 pl-9 pr-9 text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-muted/70 focus:border-teal focus:bg-white focus:ring-2 focus:ring-teal/20"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" />
        ) : (
          q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setHits([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-paper-dim"
              aria-label="Xoá"
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {open && q.trim().length >= 2 && !loading && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-float">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-ink-muted">Không thấy căn nào tên “{q.trim()}”.</p>
          ) : (
            hits.map((h) => (
              <Link
                key={h.id}
                href={`/products/${h.id}`}
                className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-paper-dim"
                onClick={() => setOpen(false)}
              >
                <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-md bg-paper-dim">
                  <ProductImage src={h.thumbnail_url} alt="" sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{h.product_name}</p>
                  <p className="flex items-center gap-1 truncate text-[11.5px] text-ink-muted">
                    <MapPin className="h-3 w-3 shrink-0 text-teal" />
                    {h.sub_region ? `${h.sub_region}, ${h.area}` : h.area}
                    {scope === "resort" && <span className="ml-1 rounded bg-paper-dim px-1 text-[10px]">{PRODUCT_TYPE_LABEL[h.type]}</span>}
                    {!!h.partners?.length && (
                      <span className="ml-1 truncate rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800" title={h.partners.join(" · ")}>
                        🤝 {h.partners.length} đối tác · rẻ nhất {h.partners[0]}
                      </span>
                    )}
                  </p>
                </div>
                {h.price_weekday != null && (
                  <span className="shrink-0 text-[12px] font-bold text-teal-dark">từ {formatVNDShort(h.price_weekday)}</span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
