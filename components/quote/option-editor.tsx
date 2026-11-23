"use client";

import { optionTotals, perPax } from "@/lib/quote-calc";
import type { QuoteItem, QuoteOption } from "@/lib/quote-types";
import { vnd } from "@/lib/tour-utils";
import { Field, TextIn } from "@/components/quote/fields";
import { ItemTable } from "@/components/quote/item-table";
import { ProductPicker } from "@/components/quote/product-picker";

/** Sửa 1 phương án: thông tin nơi ở, chọn từ kho, dòng dịch vụ, tổng */
export function OptionEditor({
  option: o,
  onChange,
  from,
  to,
  vatRate,
  paxCount,
}: {
  option: QuoteOption;
  onChange: (o: QuoteOption) => void;
  from: string | null;
  to: string | null;
  vatRate: number;
  paxCount: number | null;
}) {
  const set = (patch: Partial<QuoteOption>) => onChange({ ...o, ...patch });
  const t = optionTotals(o, vatRate);
  const pp = perPax(t.total, paxCount);
  const hl = [0, 1, 2].map((i) => o.highlights[i] ?? "");

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Tên nơi ở / phương án">
          <TextIn value={o.name} onChange={(v) => set({ name: v })} placeholder="VD: Ivory Villas & Resort" />
        </Field>
        <Field label="Địa điểm">
          <TextIn value={o.place} onChange={(v) => set({ place: v })} placeholder="VD: Lương Sơn · Hòa Bình" />
        </Field>
        <Field label="Link ảnh" className="sm:col-span-2">
          <div className="flex gap-2">
            <TextIn value={o.image_url} onChange={(v) => set({ image_url: v })} placeholder="https://…" />
            {o.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.image_url} alt="" className="h-9 w-14 shrink-0 rounded-md object-cover" />
            )}
          </div>
        </Field>
        <Field label="Điểm nổi bật (tối đa 3 dòng)" className="sm:col-span-2">
          <div className="grid gap-1.5 sm:grid-cols-3">
            {hl.map((h, i) => (
              <TextIn
                key={i}
                value={h}
                onChange={(v) => {
                  const n = [...hl];
                  n[i] = v;
                  set({ highlights: n });
                }}
                placeholder={["VD: Villa 4PN, bể bơi riêng", "VD: Gồm ăn sáng", "…"][i]}
              />
            ))}
          </div>
        </Field>
      </div>

      <ProductPicker
        from={from}
        to={to}
        onPick={({ option, items }) =>
          onChange({
            ...o,
            name: o.name || option.name,
            place: o.place || option.place,
            image_url: o.image_url || option.image_url,
            highlights: o.highlights.some(Boolean) ? o.highlights : option.highlights,
            product_id: o.product_id ?? option.product_id,
            items: [...o.items, ...items],
          })
        }
      />

      <ItemTable items={o.items} onChange={(items: QuoteItem[]) => set({ items })} />

      <div className="ml-auto max-w-sm space-y-0.5 rounded-xl bg-paper p-3 text-[13px] tabular-nums">
        <p className="flex justify-between">
          <span className="text-ink-muted">Cộng</span>
          <b>{vnd(t.subtotal)}</b>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-muted">VAT {vatRate}%</span>
          <b>{vnd(t.vat)}</b>
        </p>
        <p className="flex justify-between text-[15px] font-extrabold text-teal-dark">
          <span>Tổng</span>
          <span>{vnd(t.total)}</span>
        </p>
        {pp != null && <p className="text-right text-[11.5px] text-ink-muted">≈ {vnd(pp)}/khách</p>}
      </div>
    </div>
  );
}
