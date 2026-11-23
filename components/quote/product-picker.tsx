"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { QuoteItem, QuoteOption } from "@/lib/quote-types";
import { fieldCls } from "@/components/quote/fields";
import { cn } from "@/lib/utils";

type Hit = { id: string; product_name: string; type: string; area: string; sub_region: string | null };
type Fill = { option: Pick<QuoteOption, "name" | "place" | "image_url" | "highlights" | "product_id">; items: QuoteItem[]; rates: { id: string; label: string }[] };

/** Chọn villa/resort trong kho → điền tên, ảnh, điểm nổi bật + dòng "Nơi nghỉ" theo đúng ngày */
export function ProductPicker({ from, to, onPick }: { from: string | null; to: string | null; onPick: (f: { option: Fill["option"]; items: QuoteItem[] }) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<{ hit: Hit; fill: Fill } | null>(null);
  const [rateId, setRateId] = useState("");
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/products/names?q=${encodeURIComponent(q.trim())}`).then((x) => x.json()).catch(() => ({ results: [] }));
      setHits(r.results ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function fill(productId: string, rate = "") {
    const sp = new URLSearchParams({ product: productId });
    if (rate) sp.set("rate", rate);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const res = await fetch(`/api/quotes/fill?${sp}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Không lấy được giá");
    return data as Fill;
  }

  async function choose(hit: Hit) {
    setBusy(true);
    try {
      setPicked({ hit, fill: await fill(hit.id) });
      setRateId("");
      setCount(1);
      setHits([]);
      setQ("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
    setBusy(false);
  }

  async function add() {
    if (!picked) return;
    setBusy(true);
    try {
      if (picked.fill.rates.length && !rateId) throw new Error("Chọn hạng phòng trước");
      const f = picked.fill.rates.length ? await fill(picked.hit.id, rateId) : picked.fill;
      onPick({ option: f.option, items: f.items.map((it) => ({ ...it, qty: count })) });
      toast.success(`Đã thêm ${picked.hit.product_name}${from ? "" : " (chưa chọn ngày — giá ngày thường)"}`);
      setPicked(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-teal/30 bg-teal-light/40 p-2.5">
      <p className="mb-1.5 text-[11.5px] font-bold text-teal-dark">Chọn từ kho (villa / resort / khách sạn)</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gõ tên, VD: Ivory, Wyndham…" className={cn(fieldCls, "pl-8")} />
        {busy && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-ink-muted" />}
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-white shadow-float">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => choose(h)} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-paper">
                  <b>{h.product_name}</b> <span className="text-ink-muted">· {[h.area, h.sub_region].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked && (
        <div className="mt-2 flex flex-wrap items-end gap-2 text-[12.5px]">
          <span className="w-full font-bold">{picked.hit.product_name}</span>
          {picked.fill.rates.length > 0 && (
            <select value={rateId} onChange={(e) => setRateId(e.target.value)} className={cn(fieldCls, "min-w-[180px] flex-1")}>
              <option value="">Chọn hạng phòng…</option>
              {picked.fill.rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1 text-ink-muted">
            Số {picked.hit.type === "villa" ? "căn" : "phòng"}
            <input type="number" min={1} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} className={cn(fieldCls, "w-16")} />
          </label>
          <button type="button" onClick={add} disabled={busy} className="h-9 rounded-lg bg-teal px-3 font-bold text-white disabled:opacity-60">
            Thêm vào phương án
          </button>
          <button type="button" onClick={() => setPicked(null)} className="h-9 px-2 text-ink-muted">
            Huỷ
          </button>
        </div>
      )}
    </div>
  );
}
