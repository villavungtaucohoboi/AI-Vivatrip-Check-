"use client";

import { useState } from "react";
import { AlertTriangle, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateVN } from "@/lib/pricing";
import { minRatePrice, nightSlot, parseISO, priceColumns, quoteStay, slotKeyOf, slotPrice, type StayQuote } from "@/lib/resort-pricing";
import { roomMeta } from "@/lib/resort-text";
import type { Holiday, HotelRate, Product } from "@/lib/types";

const k = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000 ? `${new Intl.NumberFormat("vi-VN").format(Math.round(n / 1000))}k` : `${n}đ`;

/** Dòng "đang áp dụng giai đoạn nào" phía trên bảng giá. */
export function SeasonBar({ quote, nights }: { quote: StayQuote | null; nights: number }) {
  if (!quote) {
    return (
      <div className="rounded-xl bg-paper-dim px-3 py-2 text-[12.5px] font-medium text-ink-muted">
        📅 Chưa chọn ngày — đang hiện giá thấp nhất. Chọn ngày để ra đúng giá giai đoạn.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="rounded-xl bg-sand-light px-3 py-2 text-[12.5px] font-semibold text-sand-dark">
        🗓️{" "}
        {quote.label ? (
          <>
            Áp dụng: <b className="text-ink">{quote.label}</b>
            {nights > 1 && <> · {nights} đêm</>}
          </>
        ) : (
          <>
            {nights} đêm khác giá:{" "}
            {quote.nights.map((n, i) => (
              <span key={n.date}>
                {i > 0 && ", "}
                <b className="text-ink">{formatDateVN(n.date).slice(0, 5)}</b> {n.periodName}
                {n.weekend ? " (cuối tuần)" : ""}
              </span>
            ))}
          </>
        )}
      </div>
      {quote.outOfContract && (
        <p className="flex items-center gap-1 rounded-lg bg-hot-light px-2.5 py-1.5 text-[11.5px] font-semibold text-hot">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Ngày đi nằm ngoài các giai đoạn trong hợp đồng — kiểm tra lại giá với resort.
        </p>
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
  const first = [...quotes.values()][0] ?? null;
  const nights = first?.nights.length ?? 1;
  const cols = priceColumns(product, rates);
  // Cột cần tô đỏ: các ô giá mà các đêm khách ở rơi vào
  const hot = new Set<string>();
  if (checkin && first) {
    first.nights.forEach((n) => hot.add(slotKeyOf(nightSlot(parseISO(n.date), product, holidays), product, rates)));
  }

  return (
    <div className="space-y-2">
      <SeasonBar quote={first} nights={nights} />

      {!full ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rates.map((r) => {
            const q = quotes.get(r.id);
            const shown = q ? q.avg : minRatePrice(r, product);
            const base = q ? q.avgBase : null;
            const hasDisc = !!q && base != null && shown != null && base > shown;
            const best = r.id === bestRateId;
            return (
              <div key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5", best && "bg-hot-light")}>
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
                  {hasDisc && <p className="text-[11px] text-ink-muted/80 line-through">{k(base)}</p>}
                  <p className={cn("text-[17px] font-extrabold leading-tight", q ? "text-hot" : "text-ink")}>
                    {!q && <span className="mr-1 text-[11px] font-semibold text-ink-muted">từ</span>}
                    {k(shown)}
                    {(Number(r.discount_percent) || 0) > 0 && (
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
          <table className="w-full border-separate border-spacing-0 text-[12.5px]" style={{ minWidth: 150 + cols.length * 96 }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[130px] border-b border-border bg-white px-2 py-2 text-left text-[11px] font-bold uppercase text-ink-muted">
                  Hạng phòng
                </th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn("border-b border-border px-2 py-2 text-right align-bottom text-[10.5px] font-bold leading-tight text-ink-muted", hot.has(c.key) && "text-hot")}
                  >
                    <span className="uppercase">{c.title}</span>
                    {c.sub && <span className="block uppercase">{c.sub}</span>}
                    {c.ranges && <span className="block font-medium normal-case opacity-80">{c.ranges}</span>}
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
                  {cols.map((c) => {
                    const p = slotPrice(r, product, c.periodKey, c.weekend);
                    const disc = p.base != null && p.final != null && p.final < p.base;
                    return (
                      <td
                        key={c.key}
                        className={cn("whitespace-nowrap border-b border-border px-2 py-2 text-right align-top font-bold tabular-price", hot.has(c.key) && "bg-hot-light text-hot")}
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
        {full ? "Thu gọn ▴" : `Xem bảng giá đủ ${cols.length} mức ▾`}
      </button>
      <p className="text-[11px] text-ink-muted">Giá /phòng /đêm{checkin ? " (trung bình các đêm)" : ""}. Ưu đãi % đã trừ sẵn.</p>
    </div>
  );
}
