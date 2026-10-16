"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateVN } from "@/lib/pricing";
import { RATE_TIERS, quoteStay, tierPrice, type RateTier, type StayQuote } from "@/lib/resort-pricing";
import { roomMeta } from "@/lib/resort-text";
import type { Holiday, HotelRate, Product } from "@/lib/types";

const k = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000 ? `${new Intl.NumberFormat("vi-VN").format(Math.round(n / 1000))}k` : `${n}đ`;
const tierLabel = (t: RateTier) => RATE_TIERS.find((x) => x.key === t)!.label;

/** Dòng "đang áp dụng mùa nào" phía trên bảng giá. */
export function SeasonBar({ quote, nights }: { quote: StayQuote | null; nights: number }) {
  if (!quote) {
    return (
      <div className="rounded-xl bg-paper-dim px-3 py-2 text-[12.5px] font-medium text-ink-muted">
        📅 Chưa chọn ngày — đang hiện giá thấp nhất (thấp điểm, ngày thường)
      </div>
    );
  }
  const icon = quote.nights.some((n) => n.tier === "holiday") ? "🎉" : quote.nights.some((n) => n.tier.startsWith("high")) ? "🔥" : "🍃";
  return (
    <div className="rounded-xl bg-sand-light px-3 py-2 text-[12.5px] font-semibold text-sand-dark">
      {icon}{" "}
      {quote.tier ? (
        <>
          Áp dụng: <b className="text-ink">{tierLabel(quote.tier)}</b>
          {nights > 1 && <> · {nights} đêm</>}
        </>
      ) : (
        <>
          {nights} đêm khác mức giá:{" "}
          {quote.nights.map((n, i) => (
            <span key={n.date}>
              {i > 0 && ", "}
              <b className="text-ink">{formatDateVN(n.date).slice(0, 5)}</b> {RATE_TIERS.find((x) => x.key === n.tier)!.short}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

export function ResortRatesTable({
  product,
  rates,
  holidays,
  checkin,
  checkout,
  bestRateId,
  defaultFull = false,
}: {
  product: Product;
  rates: HotelRate[];
  holidays: Holiday[];
  checkin?: string;
  checkout?: string;
  bestRateId?: string | null;
  defaultFull?: boolean;
}) {
  const [full, setFull] = useState(defaultFull);
  const quotes = new Map(rates.map((r) => [r.id, checkin ? quoteStay(r, product, holidays, checkin, checkout) : null]));
  const nights = quotes.values().next().value?.nights.length ?? 1;
  const anyQuote = [...quotes.values()][0] ?? null;
  const hotTier = anyQuote?.tier ?? (checkin ? null : null);

  return (
    <div className="space-y-2">
      <SeasonBar quote={anyQuote} nights={nights} />

      {!full ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rates.map((r) => {
            const q = quotes.get(r.id);
            const lowest = tierPrice(r, "low_wd");
            const shown = q ? q.avg : lowest.final;
            const baseShown = q
              ? (() => {
                  const bases = q.nights.map((n) => tierPrice(r, n.tier).base);
                  return bases.every((b) => b != null) ? Math.round((bases as number[]).reduce((a, b) => a + b, 0) / bases.length) : null;
                })()
              : lowest.base;
            const hasDisc = (Number(r.discount_percent) || 0) > 0 && baseShown != null && shown != null && baseShown > shown;
            const best = r.id === bestRateId;
            return (
              <div key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5", q && "bg-hot-light/40", best && "bg-hot-light")}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[13.5px] font-bold leading-snug text-ink">
                    {best && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    <span className="truncate">{r.room_type}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-ink-muted">
                    {roomMeta(r).map((m) =>
                      m === "Ăn sáng" ? (
                        <span key={m} className="flex items-center gap-0.5 font-semibold text-emerald-700">
                          <Check className="h-3 w-3" />
                          {m}
                        </span>
                      ) : (
                        <span key={m}>{m}</span>
                      )
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-price">
                  {hasDisc && <p className="text-[11px] text-ink-muted/80 line-through">{k(baseShown)}</p>}
                  <p className={cn("text-[17px] font-extrabold leading-tight", q ? "text-hot" : "text-ink")}>
                    {!q && <span className="mr-1 text-[11px] font-semibold text-ink-muted">từ</span>}
                    {k(shown)}
                    {hasDisc && (
                      <span className="ml-1 rounded-md bg-coral px-1 py-0.5 align-middle text-[10px] font-extrabold text-white">
                        -{r.discount_percent}%
                      </span>
                    )}
                  </p>
                  {q && nights > 1 && q.total != null && (
                    <p className="text-[11px] font-semibold text-ink-muted">
                      {nights} đêm = <b className="text-ink">{k(q.total)}</b>
                    </p>
                  )}
                  {q && nights === 1 && <p className="text-[10.5px] text-ink-muted">/đêm</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[12.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[130px] border-b border-border bg-white px-2 py-2 text-left text-[11px] font-bold uppercase text-ink-muted">Hạng phòng</th>
                {RATE_TIERS.map((t) => (
                  <th
                    key={t.key}
                    className={cn(
                      "border-b border-border px-2 py-2 text-right text-[10.5px] font-bold uppercase leading-tight text-ink-muted",
                      hotTier === t.key && "text-hot"
                    )}
                  >
                    {t.group}
                    {t.sub && (
                      <>
                        <br />
                        {t.sub}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="sticky left-0 z-10 w-[130px] max-w-[130px] border-b border-border bg-white px-2 py-2 align-top shadow-[4px_0_6px_-6px_rgba(0,0,0,0.25)]">
                    <p className="font-bold text-ink">{r.room_type}</p>
                    <p className="text-[11px] text-ink-muted">{roomMeta(r).join(" · ")}</p>
                  </td>
                  {RATE_TIERS.map((t) => {
                    const p = tierPrice(r, t.key);
                    const disc = p.base != null && p.final != null && p.final < p.base;
                    return (
                      <td
                        key={t.key}
                        className={cn(
                          "whitespace-nowrap border-b border-border px-2 py-2 text-right align-top font-bold tabular-price",
                          hotTier === t.key && "bg-hot-light text-hot"
                        )}
                      >
                        {disc && <span className="block text-[10.5px] font-medium text-ink-muted/80 line-through">{k(p.base)}</span>}
                        {k(p.final)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="button" onClick={() => setFull((v) => !v)} className="text-[12.5px] font-bold text-teal-dark">
        {full ? "Thu gọn ▴" : "Xem đủ 5 mức giá ▾"}
      </button>
      <p className="text-[11px] text-ink-muted">Giá /phòng /đêm{checkin ? " (trung bình các đêm)" : ""}. Ưu đãi % đã trừ sẵn.</p>
    </div>
  );
}
