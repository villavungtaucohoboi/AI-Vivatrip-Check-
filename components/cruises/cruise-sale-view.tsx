"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Check, ChevronDown, Clock, Download, Eye, ImageIcon, Link2, Loader2, Search, Share2, Star, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatVND } from "@/lib/format";
import { canShareImages, copyImagesCollage, shareImages } from "@/lib/cruise-images";
import {
  CRUISE_CATEGORY_LABEL,
  CRUISE_STARS,
  CRUISE_VARIANTS,
  variantLabel,
  cruiseQuoteText,
  cruiseShareUrl,
  includedServices,
  itineraryItems,
  mealSummary,
  priceAfterPercent,
  type Cruise,
  type CruiseCategory,
} from "@/lib/cruise-types";

/** 1.070.000 → "1.070k" cho gọn khi xếp nhiều mức giá trên 1 dòng. */
function shortVND(n: number): string {
  if (n >= 1000 && n % 1000 === 0) return `${new Intl.NumberFormat("vi-VN").format(n / 1000)}k`;
  return formatVND(n);
}

/** Bỏ dấu để tìm tên không phân biệt dấu: "catherine" khớp "Catherine". */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
}

type SortMode = "default" | "asc" | "desc";

/** Các phần thông tin Sale có thể ẩn/hiện trên thẻ (nhớ theo từng máy). */
const VISIBLE_FIELDS = [
  { key: "info", label: "Giờ · sao · sức chứa" },
  { key: "child", label: "Giá trẻ em" },
  { key: "cabin", label: "Hạng cabin" },
  { key: "meal", label: "Ăn uống" },
] as const;
type FieldKey = (typeof VISIBLE_FIELDS)[number]["key"];
const FIELDS_STORAGE_KEY = "vt-cruise-visible-fields";
const ALL_FIELDS: Record<FieldKey, boolean> = { info: true, child: true, cabin: true, meal: false };

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
      {n}
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
    </span>
  );
}

function Section({ title, hint, defaultOpen, children }: { title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-[12.5px] font-bold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span className="flex items-center gap-1 text-[11.5px] font-medium text-ink-muted">
          {hint}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="pb-2.5">{children}</div>
    </details>
  );
}

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
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [bay, setBay] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, string>>({});
  const [imgBusy, setImgBusy] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(canShareImages()), []);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [cat, setCat] = useState<CruiseCategory>("day");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stars, setStars] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<SortMode>("default");
  const [q, setQ] = useState("");
  const [fields, setFields] = useState<Record<FieldKey, boolean>>(ALL_FIELDS);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FIELDS_STORAGE_KEY);
      if (raw) setFields({ ...ALL_FIELDS, ...JSON.parse(raw) });
    } catch {
      // trình duyệt chặn lưu trữ → dùng mặc định
    }
  }, []);
  function toggleField(k: FieldKey) {
    setFields((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      try {
        localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua
      }
      return next;
    });
  }
  function toggleStar(n: number) {
    setStars((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  const counts = useMemo(
    () => ({ day: new Set(cruises.filter((c) => c.category === "day").map((c) => c.name.trim().toLowerCase())).size, night: cruises.filter((c) => c.category === "night").length }),
    [cruises]
  );
  const inCat = single ? cruises : cruises.filter((c) => c.category === cat);
  const nq = plain(q);
  const filtered = single
    ? cruises
    : inCat.filter(
        (c) =>
          (stars.size === 0 || (c.star != null && stars.has(c.star))) &&
          (cat !== "night" || bay === null || c.variant === bay) &&
          (!nq || plain(c.name).includes(nq))
      );
  // Trong ngày: các dòng cùng tên (Day Cruise / Dinner Cruise) gộp thành 1 thẻ có tab.
  const groups = useMemo(() => {
    const map = new Map<string, Cruise[]>();
    for (const c of filtered) {
      const key = !single && c.category === "day" ? `d:${c.name.trim().toLowerCase()}` : c.id;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    const order = CRUISE_VARIANTS.day.map((v) => v.key);
    const out = Array.from(map.entries()).map(([key, rows]) => ({
      key,
      rows: [...rows].sort((a, b) => order.indexOf(a.variant ?? "") - order.indexOf(b.variant ?? "")),
    }));
    if (sort !== "default") {
      // Giá dùng để sắp xếp = giá người lớn (sau CK) thấp nhất trong nhóm
      const price = (g: { rows: Cruise[] }) => Math.min(...g.rows.map((r) => priceAfterPercent(r.price_adult, r.discount_percent)));
      out.sort((a, b) => (sort === "asc" ? price(a) - price(b) : price(b) - price(a)));
    }
    return out;
  }, [filtered, single, sort]);
  const list = groups;
  const baysPresent = CRUISE_VARIANTS.night.filter((v) => cruises.some((c) => c.category === "night" && c.variant === v.key));
  // Luôn hiện 4★ 5★ 6★ (và 3★ nếu có tàu 3 sao) để Sale lọc nhanh
  const starsShown = CRUISE_STARS.filter((n) => n >= 4 || cruises.some((c) => c.category === cat && c.star === n));
  const countStar = (n: number) => cruises.filter((c) => c.category === cat && c.star === n).length;

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

  async function handleCopyImages(id: string, urls: string[]) {
    setImgBusy(`c${id}`);
    try {
      await copyImagesCollage(urls);
      toast.success(`Đã copy ${Math.min(urls.length, 9)} ảnh (ghép thành 1 ảnh) — mở Zalo bấm Ctrl+V để dán.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không copy được ảnh.");
    } finally {
      setImgBusy(null);
    }
  }

  async function handleShareImages(id: string, name: string, urls: string[]) {
    setImgBusy(`s${id}`);
    try {
      await shareImages(urls, name);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) toast.error("Không chia sẻ được ảnh. Thử lại hoặc dùng nút Copy ảnh.");
    } finally {
      setImgBusy(null);
    }
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
            onClick={() => { setCat(c); setStars(new Set()); setBay(null); }}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${cat === c ? "bg-gradient-to-r from-teal-dark to-teal text-white shadow-md" : "border border-border bg-white text-ink-muted hover:bg-paper-dim"}`}
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

      {!single && cat === "night" && baysPresent.length > 0 && (
        <div className="-mx-4 mt-2 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[11.5px] font-bold text-ink-muted">Vịnh:</span>
          {[null, ...baysPresent.map((v) => v.key)].map((k) => (
            <button
              key={k ?? "all"}
              onClick={() => setBay(k)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${bay === k ? "bg-teal-dark text-white" : "border border-border bg-white text-ink-muted hover:bg-paper-dim"}`}
            >
              {k === null ? "Tất cả" : variantLabel(k)}
            </button>
          ))}
        </div>
      )}

      {!single && (
        <div className="mt-3 space-y-2">
          {/* Tìm theo tên */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên du thuyền… (VD: catherine, ambassador)"
              className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-9 text-[13.5px] text-ink outline-none placeholder:text-ink-muted/70 focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-paper-dim" aria-label="Xoá">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Hạng sao (chọn nhiều) */}
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[11.5px] font-bold text-ink-muted">Hạng sao:</span>
            <button
              onClick={() => setStars(new Set())}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${stars.size === 0 ? "bg-teal-dark text-white" : "border border-border bg-white text-ink-muted"}`}
            >
              Tất cả
            </button>
            {starsShown.map((n) => {
              const on = stars.has(n);
              const cnt = countStar(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleStar(n)}
                  disabled={cnt === 0}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-40 ${
                    on ? "bg-amber-500 text-white shadow-sm" : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {n}
                  <Star className={`h-3 w-3 ${on ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
                  <span className="opacity-70">({cnt})</span>
                </button>
              );
            })}
          </div>

          {/* Sắp xếp giá + ẩn/hiện thông tin */}
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            {(
              [
                ["default", "Mặc định"],
                ["asc", "Giá thấp → cao"],
                ["desc", "Giá cao → thấp"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${sort === k ? "bg-teal-dark text-white" : "border border-border bg-white text-ink-muted"}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowFieldPicker((v) => !v)}
              className={`ml-auto flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold ${showFieldPicker ? "bg-ink text-white" : "border border-border bg-white text-ink-muted"}`}
            >
              <Eye className="h-3.5 w-3.5" /> Ẩn/hiện
            </button>
          </div>
          {showFieldPicker && (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-white p-2">
              {VISIBLE_FIELDS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => toggleField(f.key)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${fields[f.key] ? "bg-teal-light text-teal-dark" : "bg-paper-dim text-ink-muted line-through"}`}
                >
                  {fields[f.key] && <Check className="h-3.5 w-3.5" />}
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {(q || stars.size > 0) && (
            <p className="text-[12px] text-ink-muted">Tìm thấy <b className="text-ink">{list.length}</b> du thuyền</p>
          )}
        </div>
      )}

      <div className="mt-3">
        {list.length === 0 ? (
          <EmptyState title="Chưa có du thuyền nào ở mục này" description="Admin sẽ cập nhật sớm." />
        ) : (
          <div className={single ? "mx-auto max-w-xl" : "grid items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-3"}>
            {list.map((g) => {
              const c = g.rows.find((r) => r.id === tab[g.key]) ?? g.rows[0];
              const meal = mealSummary(c.meals);
              const services = includedServices(c.services);
              const it = itineraryItems(c.itinerary);
              const adult = priceAfterPercent(c.price_adult, c.discount_percent);
              const imgs = (c.images.length ? c.images : g.rows.flatMap((r) => r.images)).map((i) => i.url);
              return (
                <Card key={g.key} className="overflow-hidden transition-shadow hover:shadow-float">
                  <div className="flex gap-3 p-3">
                    <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-teal-dark to-teal">
                      {imgs.length > 0 && (
                        <button type="button" onClick={() => setLightbox({ images: imgs, index: 0 })} className="absolute inset-0 block" aria-label="Xem ảnh">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgs[0]} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <ImageIcon className="h-2.5 w-2.5" /> {imgs.length}
                          </span>
                        </button>
                      )}
                      {c.discount_percent > 0 && (
                        <span className="absolute right-1 top-1 rounded-md bg-coral px-1.5 py-0.5 text-[10.5px] font-extrabold text-white shadow">-{c.discount_percent}%</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="line-clamp-2 text-[15px] font-extrabold leading-snug text-ink">{c.name}</p>
                        {!single && (
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label="Chọn để tải gộp" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#0E6B5A]" />
                        )}
                      </div>
                      {g.rows.length > 1 && (
                        <div className="my-1 inline-flex rounded-lg bg-paper-dim p-0.5">
                          {g.rows.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setTab((p) => ({ ...p, [g.key]: r.id }))}
                              className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-bold ${r.id === c.id ? "bg-white text-teal-dark shadow-sm" : "text-ink-muted"}`}
                            >
                              {variantLabel(r.variant) || "Tiêu chuẩn"}
                            </button>
                          ))}
                        </div>
                      )}
                      {fields.info && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-muted">
                          {c.star ? <Stars n={c.star} /> : <span>{CRUISE_CATEGORY_LABEL[c.category]}</span>}
                          {variantLabel(c.variant) && c.category === "night" && <span className="font-semibold text-teal">{variantLabel(c.variant)}</span>}
                          {c.duration_label && (
                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{c.duration_label}</span>
                          )}
                          {(c.capacity || c.cabin_count) && (
                            <span className="flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              {[c.capacity ? `${c.capacity} chỗ` : "", c.cabin_count ? `${c.cabin_count} cabin` : ""].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-[19px] font-extrabold leading-none tracking-tight text-hot tabular-price">{formatVND(adult)}</span>
                        <span className="text-[10.5px] font-medium text-ink-muted">/ người lớn</span>
                        {c.discount_percent > 0 && (
                          <span className="text-[11px] text-ink-muted/80 line-through tabular-price">{formatVND(c.price_adult)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {fields.child && c.child_prices.length > 0 && (
                    <div className="mx-3 mb-2 flex flex-wrap gap-1">
                      {c.child_prices.map((t, ti) => (
                        <span key={ti} className="rounded-lg bg-sky-50 px-2 py-1 text-[11.5px] text-sky-800 ring-1 ring-sky-100">
                          TE {t.age_label}: <b>{priceAfterPercent(t.price, c.discount_percent) === 0 ? "Miễn phí" : shortVND(priceAfterPercent(t.price, c.discount_percent))}</b>
                        </span>
                      ))}
                    </div>
                  )}

                  {fields.cabin && c.cabins.length > 0 && (
                    <div className="mx-3 mb-2 flex flex-wrap gap-1">
                      {c.cabins.map((x) => (
                        <span key={x.id} className="rounded-lg bg-teal-light px-2 py-1 text-[11.5px] text-teal-dark">
                          {x.name}: <b>{shortVND(priceAfterPercent(x.price, c.discount_percent))}</b>
                        </span>
                      ))}
                    </div>
                  )}

                  {fields.meal && (
                    <p className="mx-3 mb-2 text-[11.5px] font-medium text-ink">
                      🍽 {meal.full ? `Trọn gói các bữa${c.meals.length > 1 ? ` (${c.meals.length} bữa)` : ""}` : meal.on.length ? meal.on.join(" · ") : "Không gồm bữa ăn"}
                    </p>
                  )}

                  {single ? null : (
                    <div className="flex gap-1.5 px-3 pb-3">
                      <button type="button" onClick={() => handleCopy(c)} className="flex h-9 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-gradient-to-r from-teal-dark to-teal text-[12px] font-bold text-white shadow-sm">
                        {copiedId === c.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                        Link
                      </button>
                      {imgs.length > 0 && (
                        <button type="button" disabled={imgBusy !== null} onClick={() => handleCopyImages(c.id, imgs)} className="flex h-9 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-border bg-white text-[12px] font-bold text-teal-dark disabled:opacity-60">
                          {imgBusy === `c${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                          Ảnh
                        </button>
                      )}
                      {imgs.length > 0 && canShare && (
                        <button type="button" disabled={imgBusy !== null} onClick={() => handleShareImages(c.id, c.name, imgs)} className="flex h-9 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-sky-200 bg-sky-50 text-[12px] font-bold text-sky-700 disabled:opacity-60">
                          {imgBusy === `s${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                          Zalo
                        </button>
                      )}
                      <button type="button" onClick={() => setOpen((p) => ({ ...p, [g.key]: !p[g.key] }))} className="flex h-9 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded-xl border border-border bg-white px-2.5 text-[12px] font-bold text-ink-muted">
                        {open[g.key] ? "Thu gọn" : "Chi tiết"}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open[g.key] ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  )}

                  {(single || open[g.key]) && (
                    <div className="border-t border-border px-2.5 pb-3">
                      <Section title="Ăn uống & dịch vụ" defaultOpen>
                        {meal.full ? (
                          <p className="text-[12.5px] font-semibold text-teal-dark">✓ Ăn trọn gói các bữa theo lịch trình{c.meals.length > 1 ? ` (${c.meals.length} bữa)` : ""}</p>
                        ) : meal.on.length ? (
                          <>
                            <p className="text-[12.5px] font-semibold text-ink">✓ {meal.on.join(" · ")}</p>
                            {meal.off.length > 0 && <p className="text-[11px] text-ink-muted">Không gồm: {meal.off.join(", ")}</p>}
                          </>
                        ) : (
                          <p className="text-[12.5px] text-ink-muted">Không bao gồm bữa ăn</p>
                        )}
                        {services.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {services.map((s) => (
                              <span key={s} className="rounded-full bg-teal-light px-2 py-0.5 text-[11px] font-semibold text-teal-dark">✓ {s}</span>
                            ))}
                          </div>
                        )}
                      </Section>
                      {it.length > 0 && (
                        <Section title="Lịch trình" hint={`${it.length} mốc`} defaultOpen={single}>
                          <div className="space-y-0.5 border-l-2 border-teal-light pl-2.5">
                            {it.map((x, i) => (
                              <p key={i} className="text-[12px] leading-snug text-ink">
                                {x.time && <b className="mr-1.5 text-teal-dark">{x.time}</b>}
                                {x.text}
                              </p>
                            ))}
                          </div>
                        </Section>
                      )}
                      {imgs.length > 1 && (
                        <Section title="Ảnh" hint={`${imgs.length} ảnh`}>
                          <div className="flex gap-1.5 overflow-x-auto">
                            {imgs.map((u, ii) => (
                              <button key={u} type="button" onClick={() => setLightbox({ images: imgs, index: ii })} className="shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u} alt="" loading="lazy" className="h-12 w-[68px] rounded-md object-cover" />
                              </button>
                            ))}
                          </div>
                        </Section>
                      )}
                      {c.note && !/^https?:\/\//i.test(c.note.trim()) && <p className="mt-2 text-[11.5px] text-ink-muted">Ghi chú: {c.note}</p>}
                      {!single && (
                        <button
                          type="button"
                          onClick={() => handleZip([c], `Lich-trinh-${slugify(c.name)}.zip`, c.id)}
                          disabled={zipping !== null}
                          className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-[12px] font-bold text-teal-dark disabled:opacity-60"
                        >
                          {zipping === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          Tải file nén (lịch trình + {c.files.length} file + {imgs.length} ảnh)
                        </button>
                      )}
                      {single && <p className="mt-3 rounded-xl bg-teal-light px-3 py-2.5 text-center text-[12.5px] font-bold text-teal-dark">VivaTrip · Hotline 0942.988.699</p>}
                    </div>
                  )}
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
