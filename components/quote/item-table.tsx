"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { lineAmount } from "@/lib/quote-calc";
import { PRESET_ITEMS, QUOTE_GROUPS, emptyItem, newId, type QuoteGroup, type QuoteItem } from "@/lib/quote-types";
import { vnd } from "@/lib/tour-utils";
import { NumIn, TextIn, fieldCls } from "@/components/quote/fields";
import { cn } from "@/lib/utils";

/** Bảng dòng dịch vụ của 1 phương án (sửa trực tiếp) */
export function ItemTable({ items, onChange }: { items: QuoteItem[]; onChange: (items: QuoteItem[]) => void }) {
  const set = (id: string, patch: Partial<QuoteItem>) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const add = (it: QuoteItem) => onChange([...items, it]);

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-muted">Chưa có dịch vụ. Chọn từ kho ở trên hoặc thêm dòng bên dưới.</p>}
      {items.map((it, i) => {
        const a = lineAmount(it);
        return (
          <div key={it.id} className="rounded-xl border border-border bg-white p-2.5">
            <div className="grid grid-cols-12 gap-1.5">
              <select
                value={it.group}
                onChange={(e) => set(it.id, { group: e.target.value as QuoteGroup })}
                className={cn(fieldCls, "col-span-12 sm:col-span-3")}
                aria-label="Nhóm"
              >
                {QUOTE_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <TextIn value={it.name} onChange={(v) => set(it.id, { name: v })} placeholder="Tên dịch vụ" className="col-span-12 font-semibold sm:col-span-9" />
              <TextIn value={it.note} onChange={(v) => set(it.id, { note: v })} placeholder="Ghi chú ngắn (VD: Chưa gồm đồ uống)" className="col-span-12" />
              <NumIn value={it.qty} onChange={(v) => set(it.id, { qty: v })} placeholder="SL (1)" className="col-span-3 sm:col-span-2" />
              <TextIn value={it.qty_unit} onChange={(v) => set(it.id, { qty_unit: v })} placeholder="đơn vị" className="col-span-3 sm:col-span-2" />
              <NumIn value={it.times} onChange={(v) => set(it.id, { times: v })} placeholder="× (1)" className="col-span-3 sm:col-span-2" />
              <TextIn value={it.times_unit} onChange={(v) => set(it.id, { times_unit: v })} placeholder="đêm/bữa" className="col-span-3 sm:col-span-2" />
              <NumIn value={it.unit_price} onChange={(v) => set(it.id, { unit_price: v })} placeholder="Đơn giá (trống = theo thực tế)" className="col-span-12 sm:col-span-4" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
              <label className="flex items-center gap-1 text-ink-muted">
                <input type="checkbox" checked={it.vat} onChange={(e) => set(it.id, { vat: e.target.checked })} className="h-4 w-4 accent-teal" />
                Cộng VAT
              </label>
              <span className="ml-auto font-bold tabular-nums text-ink">{a != null ? vnd(a) : <span className="font-normal text-ink-muted">Theo thực tế</span>}</span>
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-ink-muted hover:bg-paper-dim" aria-label="Lên">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-ink-muted hover:bg-paper-dim" aria-label="Xuống">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="rounded p-1 text-danger hover:bg-danger-light" aria-label="Xoá dòng">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-1.5">
        {QUOTE_GROUPS.map((g) => (
          <button key={g} type="button" onClick={() => add(emptyItem(g))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-[12px] font-bold text-ink hover:border-teal">
            <Plus className="h-3.5 w-3.5" /> {g}
          </button>
        ))}
        <select
          value=""
          onChange={(e) => {
            const p = PRESET_ITEMS[Number(e.target.value)];
            if (p) add({ ...p, id: newId() });
          }}
          className="h-8 rounded-lg border border-teal bg-teal-light px-2 text-[12px] font-bold text-teal-dark"
          aria-label="Dịch vụ hay dùng"
        >
          <option value="">+ Dịch vụ hay dùng…</option>
          {PRESET_ITEMS.map((p, i) => (
            <option key={i} value={i}>
              {p.group} · {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
