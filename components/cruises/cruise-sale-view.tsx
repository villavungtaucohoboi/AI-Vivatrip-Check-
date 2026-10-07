"use client";

import { useMemo, useState } from "react";
import { Check, Download, Link2, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatVND } from "@/lib/format";
import {
  CRUISE_CATEGORY_LABEL,
  CRUISE_STARS,
  cruiseQuoteText,
  cruiseShareUrl,
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

export function CruiseSaleView({ cruises, single = false }: { cruises: Cruise[]; single?: boolean }) {
  const [star, setStar] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [cat, setCat] = useState<CruiseCategory>("day");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({ day: cruises.filter((c) => c.category === "day").length, night: cruises.filter((c) => c.category === "night").length }),
    [cruises]
  );
  const list = single ? cruises : cruises.filter((c) => c.category === cat && (star === null || c.star === star));
  const starsPresent = CRUISE_STARS.filter((n) => cruises.some((c) => c.category === cat && c.star === n));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopy(c: Cruise) {
    await copyText(cruiseShareUrl(c, window.location.origin));
    setCopiedId(c.id);
    toast.success(`Đã copy link lịch trình ${c.name} — dán vào Zalo gửi khách.`);
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
          [...c.files.map((f) => ({ name: f.file_name, url: f.file_url })), ...c.images.map((im, ii) => ({ name: `anh-${ii + 1}.jpg`, url: im.url }))].map(async (f) => {
            try {
              const res = await fetch(f.url);
              if (!res.ok) throw new Error("fetch failed");
              const blob = await res.blob();
              folder.file(f.name, blob);
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
      {!single && (
        <>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">Du thuyền Hạ Long</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Chọn tour trong ngày hoặc qua đêm — xem giá, bữa ăn, dịch vụ bao gồm, copy link lịch trình hoặc tải file nén gửi khách.
          </p>
        </>
      )}

      {!single && (<div className="mt-5 flex flex-wrap items-center gap-2">
        {(["day", "night"] as const).map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setStar(null); }}
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
      </div>)}

      {!single && starsPresent.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] font-bold text-ink-muted">Hạng sao:</span>
          {[null, ...starsPresent].map((n) => (
            <button
              key={n ?? "all"}
              onClick={() => setStar(n)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${star === n ? "bg-teal-dark text-white" : "border border-border bg-white text-ink-muted hover:bg-paper-dim"}`}
            >
              {n === null ? "Tất cả" : `${n} sao`}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState title="Chưa có du thuyền nào ở mục này" description="Admin sẽ cập nhật sớm." />
        ) : (
          <div className={single ? "mx-auto max-w-xl" : "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"}>
            {list.map((c) => {
              const meal = mealSummary(c.meals);
              const services = includedServices(c.services);
              const it = itineraryItems(c.itinerary);
              const adult = priceAfterPercent(c.price_adult, c.discount_percent);
              const imgs = c.images.map((i) => i.url);
              return (
                <Card key={c.id} className="flex flex-col overflow-hidden">
                  <div className={`relative bg-gradient-to-br from-teal-dark to-teal ${imgs.length ? "h-44" : "h-24"}`}>
                    {imgs.length > 0 && (
                      <button type="button" onClick={() => setLightbox({ images: imgs, index: 0 })} className="absolute inset-0 block" aria-label="Xem ảnh">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgs[0]} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                        {imgs.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">{imgs.length} ảnh</span>
                        )}
                      </button>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-teal-dark">
                      {CRUISE_CATEGORY_LABEL[c.category]}
                    </span>
                    {!single && (<label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-3.5 w-3.5 accent-[#0E6B5A]" />
                      Chọn
                    </label>)}
                  </div>

                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="text-[14.5px] font-bold text-ink">{c.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-muted">
                      {c.duration_label ?? CRUISE_CATEGORY_LABEL[c.category]}
                      {c.star ? ` · ${c.star} sao` : ""}
                    </p>
                    {(c.capacity || c.cabin_count) && (
                      <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-ink-muted">
                        <Users className="h-3.5 w-3.5" />
                        {[c.capacity ? `${c.capacity} chỗ` : "", c.cabin_count ? `${c.cabin_count} cabin` : ""].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <p className="mt-2.5 text-[17px] font-extrabold text-teal-dark">
                      {formatVND(adult)} <span className="text-[11px] font-medium text-ink-muted">/ người lớn</span>
                    </p>
                    {c.child_prices.map((t, ti) => (
                      <p key={ti} className="text-[11.5px] text-ink-muted">
                        Trẻ em {t.age_label}: <b className="text-ink">{formatVND(priceAfterPercent(t.price, c.discount_percent))}</b>
                      </p>
                    ))}
                    {c.discount_percent > 0 && <span className="mt-1 inline-block rounded-full bg-sand-light px-2 py-0.5 text-[10px] font-bold text-sand-dark">đã CK {c.discount_percent}%</span>}

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
                      <details open={single} className="mt-3 border-t border-border pt-2">
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
                      <p className="mt-2 text-[11px] text-ink-muted">Kèm {c.files.length} file lịch trình + {c.images.length} ảnh trong file nén.</p>
                    )}

                    {imgs.length > 1 && (
                      <div className="mt-3 flex gap-1.5 overflow-x-auto">
                        {imgs.slice(1, 6).map((u, ii) => (
                          <button key={u} type="button" onClick={() => setLightbox({ images: imgs, index: ii + 1 })} className="shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" loading="lazy" className="h-12 w-16 rounded-md object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {single ? (
                      <p className="mt-4 rounded-xl bg-teal-light px-3 py-2.5 text-center text-[12.5px] font-bold text-teal-dark">VivaTrip · Hotline 0942.988.699</p>
                    ) : (
                    <div className="mt-auto flex gap-2 pt-3">
                      <Button variant="outline" className="flex-1" onClick={() => handleCopy(c)}>
                        {copiedId === c.id ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                        Link lịch trình
                      </Button>
                      <Button className="flex-1" onClick={() => handleZip([c], `Lich-trinh-${slugify(c.name)}.zip`, c.id)} disabled={zipping !== null}>
                        {zipping === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Tải file nén
                      </Button>
                    </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/90 p-2" aria-label="Đóng"><X className="h-5 w-5" /></button>
          {lightbox.images.length > 1 && (
            <button type="button" className="absolute left-3 rounded-full bg-white/90 px-3 py-2 font-bold" onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length }); }}>◀</button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.images[lightbox.index]} alt="" className="max-h-[88vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          {lightbox.images.length > 1 && (
            <button type="button" className="absolute right-3 rounded-full bg-white/90 px-3 py-2 font-bold" onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.images.length }); }}>▶</button>
          )}
        </div>
      )}
    </div>
  );
}
