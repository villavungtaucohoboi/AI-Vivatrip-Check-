"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatVND } from "@/lib/format";
import {
  CRUISE_CATEGORY_LABEL,
  cruiseQuoteText,
  includedServices,
  itineraryItems,
  mealSummary,
  priceAfterPercent,
  type Cruise,
  type CruiseCategory,
} from "@/lib/cruise-types";

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "du-thuyen"
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function CruiseSaleView({ cruises }: { cruises: Cruise[] }) {
  const [cat, setCat] = useState<CruiseCategory>("day");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({ day: cruises.filter((c) => c.category === "day").length, night: cruises.filter((c) => c.category === "night").length }),
    [cruises]
  );
  const list = cruises.filter((c) => c.category === cat);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopy(c: Cruise) {
    await copyText(cruiseQuoteText(c));
    setCopiedId(c.id);
    toast.success(`Đã copy lịch trình ${c.name} — dán vào Zalo gửi khách.`);
    setTimeout(() => setCopiedId(null), 1800);
  }

  async function handleZip(targets: Cruise[], zipName: string, busyKey: string) {
    if (targets.length === 0) return;
    setZipping(busyKey);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let rawBytes = 0;
      let missing = 0;

      for (const c of targets) {
        const folder = targets.length > 1 ? zip.folder(slugify(c.name))! : zip;
        const text = cruiseQuoteText(c);
        folder.file(`Lich-trinh-${slugify(c.name)}.txt`, text);
        rawBytes += text.length;
        await Promise.all(
          c.files.map(async (f) => {
            try {
              const res = await fetch(f.file_url);
              if (!res.ok) throw new Error("fetch failed");
              const blob = await res.blob();
              folder.file(f.file_name, blob);
              rawBytes += blob.size;
            } catch {
              missing++;
            }
          })
        );
      }

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const before = Math.max(1, Math.round(rawBytes / 1024));
      const after = Math.max(1, Math.round(blob.size / 1024));
      toast.success(`Đã nén ${before} KB xuống ${after} KB — sẵn sàng gửi khách.${missing ? ` (${missing} file không tải được)` : ""}`);
    } catch {
      toast.error("Có lỗi khi nén file. Vui lòng thử lại.");
    } finally {
      setZipping(null);
    }
  }

  const picked = cruises.filter((c) => selected.has(c.id));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink sm:text-3xl">Du thuyền Hạ Long</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Chọn tour trong ngày hoặc qua đêm — xem giá, bữa ăn, dịch vụ bao gồm, copy lịch trình hoặc tải file nén gửi khách.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["day", "night"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-bold ${cat === c ? "bg-teal text-white" : "border border-border bg-white text-ink-muted hover:bg-paper-dim"}`}
          >
            {CRUISE_CATEGORY_LABEL[c]} <span className="opacity-70">({counts[c]})</span>
          </button>
        ))}
        {picked.length > 0 && (
          <Button
            className="ml-auto"
            onClick={() => handleZip(picked, "Lich-trinh-du-thuyen-VivaTrip.zip", "multi")}
            disabled={zipping !== null}
          >
            {zipping === "multi" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Tải {picked.length} lịch đã chọn (1 file nén)
          </Button>
        )}
      </div>

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState title="Chưa có du thuyền nào ở mục này" description="Admin sẽ cập nhật sớm." />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => {
              const meal = mealSummary(c.meals);
              const services = includedServices(c.services);
              const it = itineraryItems(c.itinerary);
              const adult = priceAfterPercent(c.price_adult, c.discount_percent);
              const child = priceAfterPercent(c.price_child, c.discount_percent);
              return (
                <Card key={c.id} className="flex flex-col overflow-hidden">
                  <div className="relative h-24 bg-gradient-to-br from-teal-dark to-teal">
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-teal-dark">
                      {CRUISE_CATEGORY_LABEL[c.category]}
                    </span>
                    <label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-3.5 w-3.5 accent-[#0E6B5A]" />
                      Chọn
                    </label>
                  </div>

                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="text-[14.5px] font-bold text-ink">{c.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {c.duration_label ?? CRUISE_CATEGORY_LABEL[c.category]}
                      {c.star ? ` · ${c.star} sao` : ""}
                    </p>

                    <p className="mt-2.5 text-[17px] font-extrabold text-teal-dark">
                      {formatVND(adult)} <span className="text-[11px] font-medium text-ink-muted">/ người lớn</span>
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Trẻ em {formatVND(child)}
                      {c.discount_percent > 0 && <span className="ml-1.5 rounded-full bg-sand-light px-2 py-0.5 text-[10px] font-bold text-sand-dark">đã CK {c.discount_percent}%</span>}
                    </p>

                    {c.cabins.length > 0 && (
                      <div className="mt-2.5 border-t border-border pt-2">
                        {c.cabins.map((x) => (
                          <div key={x.id} className="flex justify-between py-0.5 text-[12px]">
                            <span className="text-ink-muted">{x.name}</span>
                            <b className="text-teal-dark">{formatVND(priceAfterPercent(x.price, c.discount_percent))}</b>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mb-1 mt-3 text-[10.5px] font-bold tracking-wide text-ink-muted">ĂN UỐNG</p>
                    {meal.full ? (
                      <p className="rounded-xl bg-teal-light px-3 py-2 text-[12.5px] font-semibold text-teal-dark">
                        ✓ Ăn trọn gói các bữa theo lịch trình{c.meals.length > 1 ? ` (${c.meals.length} bữa)` : ""}
                      </p>
                    ) : meal.on.length ? (
                      <>
                        <p className="rounded-xl bg-paper-dim px-3 py-2 text-[12.5px] font-semibold text-ink">✓ {meal.on.join(" · ")}</p>
                        {meal.off.length > 0 && <p className="mt-1 text-[11px] text-ink-muted">Không gồm: {meal.off.join(", ")}</p>}
                      </>
                    ) : (
                      <p className="rounded-xl bg-paper-dim px-3 py-2 text-[12.5px] text-ink-muted">Không bao gồm bữa ăn</p>
                    )}

                    {services.length > 0 && (
                      <>
                        <p className="mb-1 mt-3 text-[10.5px] font-bold tracking-wide text-ink-muted">DỊCH VỤ BAO GỒM</p>
                        <div className="flex flex-wrap gap-1.5">
                          {services.map((s) => (
                            <span key={s} className="rounded-full bg-teal-light px-2.5 py-1 text-[11px] font-semibold text-teal-dark">✓ {s}</span>
                          ))}
                        </div>
                      </>
                    )}

                    {it.length > 0 && (
                      <details className="mt-3 border-t border-border pt-2">
                        <summary className="cursor-pointer text-[12.5px] font-bold text-teal-dark">Xem lịch trình ({it.length} mốc)</summary>
                        <div className="mt-2 space-y-1 border-l-2 border-teal-light pl-3">
                          {it.map((x, i) => (
                            <p key={i} className="text-[12px] leading-snug text-ink">
                              {x.time && <b className="mr-1.5 text-teal-dark">{x.time}</b>}
                              {x.text}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}

                    {c.files.length > 0 && (
                      <p className="mt-2 text-[11px] text-ink-muted">Kèm {c.files.length} file lịch trình trong file nén.</p>
                    )}

                    <div className="mt-auto flex gap-2 pt-3">
                      <Button variant="outline" className="flex-1" onClick={() => handleCopy(c)}>
                        {copiedId === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy lịch trình
                      </Button>
                      <Button className="flex-1" onClick={() => handleZip([c], `Lich-trinh-${slugify(c.name)}.zip`, c.id)} disabled={zipping !== null}>
                        {zipping === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Tải file nén
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
