"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, FileUp, Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FROM_CITIES, WD, WDL, dm, isoOf, kk, weekday } from "@/lib/tour-utils";
import type { TourDay, TourDeparture, TourWithDeps } from "@/lib/tour-types";
import { cn } from "@/lib/utils";

type Form = Omit<TourWithDeps, "departures" | "id"> & { id: string };
type DepRow = TourDeparture & { key: string };

const EMPTY: Form = {
  id: "",
  code: null,
  name: "",
  country: "",
  from_city: "Hà Nội",
  days: null,
  nights: null,
  airline: "",
  flights: "",
  route_text: "",
  places: [],
  highlights: [],
  itinerary: [],
  includes: [],
  excludes: [],
  visa_notes: [],
  sale_terms: [],
  partner: "",
  partner_file: "",
  source_link: "",
  group_label: "",
  cover_url: "",
  single_usd: null,
  tips_usd: null,
  visa_discount: 0,
  route_key: "",
  hidden: false,
};
let seq = 0;
const nk = () => `r${++seq}`;
const inp = "h-10 w-full rounded-lg border border-border bg-white px-2.5 text-[13.5px] outline-none focus:border-teal";
/** "12990" = 12.990.000đ (gõ nhanh theo nghìn) */
const money = (v: string): number | null => {
  const n = Number(v.replace(/[^\d]/g, ""));
  if (!n) return null;
  return n < 100000 ? n * 1000 : n;
};
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function TourEditor({
  initial,
  today,
  partners,
  loadError,
  cloned,
}: {
  initial: TourWithDeps | null;
  today: string;
  partners: string[];
  loadError?: string;
  cloned?: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => (initial ? { ...EMPTY, ...initial, id: initial.id } : EMPTY));
  const [deps, setDeps] = useState<DepRow[]>(() => (initial?.departures ?? []).map((d) => ({ ...d, key: nk() })));
  const [showPast, setShowPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(!initial);
  const isNew = !f.id;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (location.hash === "#dates") setTimeout(() => document.getElementById("dates")?.scrollIntoView({ behavior: "smooth" }), 200);
  }, []);

  const visibleDeps = deps
    .filter((d) => showPast || !d.depart_date || d.depart_date > today)
    .sort((a, b) => (a.depart_date || "9").localeCompare(b.depart_date || "9"));
  const pastCount = deps.filter((d) => d.depart_date && d.depart_date <= today).length;

  function applyAI(t: Record<string, unknown>, link: string, partner: string, fileName: string) {
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    const a = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
    const n = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    setF((x) => ({
      ...x,
      name: s(t.name) || x.name,
      country: s(t.country) || x.country,
      from_city: s(t.from_city) || x.from_city,
      days: n(t.days) ?? x.days,
      nights: n(t.nights) ?? x.nights,
      airline: s(t.airline) || x.airline,
      flights: s(t.flights) || x.flights,
      route_text: s(t.route_text) || x.route_text,
      places: a(t.places).length ? a(t.places) : x.places,
      highlights: a(t.highlights).length ? a(t.highlights) : x.highlights,
      itinerary: Array.isArray(t.itinerary)
        ? (t.itinerary as Record<string, unknown>[]).map((d) => ({ t: s(d.t), meals: s(d.meals), items: a(d.items), hotel: s(d.hotel) }))
        : x.itinerary,
      includes: a(t.includes).length ? a(t.includes) : x.includes,
      excludes: a(t.excludes).length ? a(t.excludes) : x.excludes,
      visa_notes: a(t.visa_notes).length ? a(t.visa_notes) : x.visa_notes,
      sale_terms: a(t.sale_terms).length ? a(t.sale_terms) : x.sale_terms,
      group_label: s(t.group_label) || x.group_label,
      single_usd: n(t.single_usd) ?? x.single_usd,
      tips_usd: n(t.tips_usd) ?? x.tips_usd,
      visa_discount: n(t.visa_discount) ?? x.visa_discount,
      partner: partner || x.partner,
      partner_file: fileName || x.partner_file,
      source_link: link || x.source_link,
    }));
    const ad = Array.isArray(t.departures) ? (t.departures as Record<string, unknown>[]) : [];
    if (ad.length) {
      setDeps((prev) => {
        const m = new Map(prev.map((d) => [d.depart_date, d]));
        for (const d of ad) {
          const date = s(d.date);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !n(d.adult)) continue;
          const old = m.get(date);
          m.set(date, {
            ...(old ?? { com: null, seats: null, sold: null, old_adult: null }),
            key: old?.key ?? nk(),
            depart_date: date,
            adult: n(d.adult)!,
            child: n(d.child),
            infant: n(d.infant),
            tag: s(d.tag) || null,
          } as DepRow);
        }
        return [...m.values()];
      });
    }
    toast.success(`AI đã điền ${Array.isArray(t.itinerary) ? t.itinerary.length : 0} ngày lịch trình, ${ad.length} ngày khởi hành — kiểm tra rồi bấm Lưu.`);
    setAiOpen(false);
  }

  async function save() {
    if (!f.name.trim()) return void toast.error("Tour cần có tên.");
    const bad = deps.find((d) => !d.depart_date || !d.adult);
    if (bad) return void toast.error("Có ngày khởi hành thiếu ngày hoặc giá người lớn.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tours/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour: { ...f, id: f.id || undefined }, departures: deps.map(({ key: _k, ...d }) => d), mode: "replace" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Lưu thất bại");
      toast.success(`Đã lưu tour · ${j.departures} ngày khởi hành`);
      if (isNew) router.replace(`/admin/tours/${j.id}`);
      else router.refresh();
      setF((s) => ({ ...s, id: j.id }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  const listArea = (k: "places" | "highlights" | "includes" | "excludes" | "visa_notes" | "sale_terms", label: string, rows = 4, hint?: string) => (
    <label className="block text-[12px] font-bold text-ink-muted">
      {label} <span className="font-normal">({f[k].length} dòng){hint ? ` · ${hint}` : ""}</span>
      <textarea
        defaultValue={f[k].join("\n")}
        key={`${k}-${f[k].join("|").length}`}
        onBlur={(e) => set(k, lines(e.target.value))}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-border bg-white p-2.5 text-[13px] font-normal text-ink outline-none focus:border-teal"
      />
    </label>
  );

  return (
    <div className="space-y-4 pb-28">
      <Link href="/admin/tours" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Danh sách tour
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-ink">{isNew ? (cloned ? "Nhân bản tour" : "Thêm tour nước ngoài") : f.name || "Sửa tour"}</h1>
        {!isNew && (
          <div className="flex gap-2">
            <Link href={`/admin/tours/new?clone=${f.id}`} className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-[12.5px] font-bold text-ink">
              <Copy className="h-4 w-4" /> Nhân bản tour
            </Link>
            <button onClick={() => setAiOpen((v) => !v)} className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-[12.5px] font-bold text-ink">
              <Sparkles className="h-4 w-4" /> AI đọc lại file
            </button>
          </div>
        )}
      </div>
      {loadError && <p className="rounded-xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">{loadError}</p>}
      {cloned && (
        <p className="rounded-xl bg-teal-light p-3 text-[13px] text-teal-dark">
          Bản sao giữ nguyên lịch trình, bao gồm, visa… Đổi tên (VD thêm “2027”), sửa chỗ khác nếu cần, rồi <b>mở ngày khởi hành mới</b> ở cuối trang và Lưu.
        </p>
      )}

      {aiOpen && <AIReadBox partners={partners} defaultPartner={f.partner ?? ""} defaultLink={f.source_link ?? ""} onResult={applyAI} />}

      {/* Thông tin */}
      <section className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-teal-dark">Thông tin tour</h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Tên tour *" span2><input value={f.name} onChange={(e) => set("name", e.target.value)} className={inp} /></L>
          <L label="Nước đến"><input value={f.country} onChange={(e) => set("country", e.target.value)} placeholder="Hàn Quốc" className={inp} /></L>
          <L label="Khởi hành từ">
            <input list="from-cities" value={f.from_city} onChange={(e) => set("from_city", e.target.value)} className={inp} />
            <datalist id="from-cities">{Object.keys(FROM_CITIES).map((c) => <option key={c} value={c} />)}</datalist>
          </L>
          <L label="Số ngày"><input type="number" value={f.days ?? ""} onChange={(e) => set("days", e.target.value ? Number(e.target.value) : null)} className={inp} /></L>
          <L label="Số đêm"><input type="number" value={f.nights ?? ""} onChange={(e) => set("nights", e.target.value ? Number(e.target.value) : null)} className={inp} /></L>
          <L label="Hãng bay"><input value={f.airline ?? ""} onChange={(e) => set("airline", e.target.value)} className={inp} /></L>
          <L label="Giờ bay"><input value={f.flights ?? ""} onChange={(e) => set("flights", e.target.value)} className={inp} /></L>
          <L label="Tuyến điểm (hiện trên thẻ)" span2><input value={f.route_text ?? ""} onChange={(e) => set("route_text", e.target.value)} placeholder="Hà Nội – Seoul – Nami – Everland" className={inp} /></L>
          <L label="Ghép đoàn"><input value={f.group_label ?? ""} onChange={(e) => set("group_label", e.target.value)} placeholder="Khách lẻ ghép đoàn 25 khách" className={inp} /></L>
          <L label="Mã tour (tuỳ chọn)"><input value={f.code ?? ""} onChange={(e) => set("code", e.target.value)} className={inp} /></L>
          <L label="Phòng đơn (USD/đêm)"><input type="number" value={f.single_usd ?? ""} onChange={(e) => set("single_usd", e.target.value ? Number(e.target.value) : null)} className={inp} /></L>
          <L label="Tips HDV (USD/khách)"><input type="number" value={f.tips_usd ?? ""} onChange={(e) => set("tips_usd", e.target.value ? Number(e.target.value) : null)} className={inp} /></L>
          <L label="Khách có sẵn visa trừ (đ)"><input inputMode="numeric" value={f.visa_discount || ""} onChange={(e) => set("visa_discount", money(e.target.value) ?? 0)} placeholder="500" className={inp} /></L>
          <L label="Ảnh bìa (link ảnh, tuỳ chọn)"><input value={f.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} className={inp} /></L>
        </div>
        <div className="grid gap-2.5 rounded-xl bg-amber-50/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Đối tác (giá mua của) — chỉ Sale">
            <input list="partners" value={f.partner ?? ""} onChange={(e) => set("partner", e.target.value)} className={inp} />
            <datalist id="partners">{partners.map((p) => <option key={p} value={p} />)}</datalist>
          </L>
          <L label="Tên file gốc"><input value={f.partner_file ?? ""} onChange={(e) => set("partner_file", e.target.value)} className={inp} /></L>
          <L label="Link file gốc"><input value={f.source_link ?? ""} onChange={(e) => set("source_link", e.target.value)} className={inp} /></L>
          <L label="Gộp tuyến (so giá đối tác)"><input value={f.route_key ?? ""} onChange={(e) => set("route_key", e.target.value)} placeholder="trống = theo tên + số ngày" className={inp} /></L>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-ink sm:col-span-2">
            <input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} className="h-4 w-4 accent-teal" /> Ẩn tour khỏi trang Sale
          </label>
        </div>
      </section>

      {/* Nội dung */}
      <section className="grid gap-3 rounded-2xl border border-border bg-white p-4 lg:grid-cols-2">
        <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-teal-dark lg:col-span-2">Nội dung gửi khách (mỗi dòng 1 ý)</h2>
        {listArea("highlights", "Điểm nhấn", 6)}
        {listArea("places", "Điểm đến để tìm kiếm", 6, "Sale gõ 'Busan - Tokyo' sẽ tìm theo các dòng này")}
        {listArea("includes", "Giá bao gồm", 7)}
        {listArea("excludes", "Không bao gồm", 7)}
        {listArea("visa_notes", "Visa & lưu ý cho khách", 5)}
        {listArea("sale_terms", "Điều khoản cho Sale (khách không thấy)", 5)}
      </section>

      <ItineraryEditor days={f.itinerary} onChange={(v) => set("itinerary", v)} />

      {/* Ngày khởi hành */}
      <section id="dates" className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-teal-dark">
            Ngày khởi hành · {deps.filter((d) => d.depart_date > today).length} ngày sắp tới
          </h2>
          {pastCount > 0 && (
            <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Hiện {pastCount} ngày đã qua (Sale không thấy)
            </label>
          )}
        </div>
        <OpenDates deps={deps} today={today} onAdd={(rows) => setDeps((p) => [...p, ...rows.map((r) => ({ ...r, key: nk() }))])} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[12.5px]">
            <thead className="text-left text-[10.5px] font-bold uppercase text-ink-muted">
              <tr>
                <th className="p-1.5">Ngày đi</th>
                <th className="p-1.5">Giá NL *</th>
                <th className="p-1.5">Giá gạch</th>
                <th className="p-1.5">Trẻ em</th>
                <th className="p-1.5">Em bé</th>
                <th className="p-1.5">Com/khách</th>
                <th className="p-1.5">Tổng chỗ</th>
                <th className="p-1.5">Đã bán</th>
                <th className="p-1.5">Nhãn</th>
                <th className="p-1.5" />
              </tr>
            </thead>
            <tbody>
              {visibleDeps.map((d) => {
                const upd = (p: Partial<DepRow>) => setDeps((s) => s.map((x) => (x.key === d.key ? { ...x, ...p } : x)));
                const m = (k: keyof TourDeparture) => (
                  <input
                    defaultValue={d[k] != null ? new Intl.NumberFormat("vi-VN").format(Number(d[k])) : ""}
                    key={`${d.key}-${k}-${d[k]}`}
                    onBlur={(e) => upd({ [k]: money(e.target.value) } as Partial<DepRow>)}
                    inputMode="numeric"
                    className="h-8 w-28 rounded-md border border-border px-2 text-right tabular-nums"
                  />
                );
                const i = (k: "seats" | "sold") => (
                  <input
                    type="number"
                    value={d[k] ?? ""}
                    onChange={(e) => upd({ [k]: e.target.value === "" ? null : Number(e.target.value) })}
                    className="h-8 w-16 rounded-md border border-border px-2 text-right tabular-nums"
                  />
                );
                const past = d.depart_date && d.depart_date <= today;
                return (
                  <tr key={d.key} className={cn("border-t border-border/60", past && "opacity-50")}>
                    <td className="p-1.5">
                      <input type="date" value={d.depart_date} onChange={(e) => upd({ depart_date: e.target.value })} className="h-8 rounded-md border border-border px-1.5" />
                      {d.depart_date && <span className="ml-1 text-[10.5px] text-ink-muted">{WD[weekday(d.depart_date)]}</span>}
                    </td>
                    <td className="p-1.5">{m("adult")}</td>
                    <td className="p-1.5">{m("old_adult")}</td>
                    <td className="p-1.5">{m("child")}</td>
                    <td className="p-1.5">{m("infant")}</td>
                    <td className="p-1.5">{m("com")}</td>
                    <td className="p-1.5">{i("seats")}</td>
                    <td className="p-1.5">{i("sold")}</td>
                    <td className="p-1.5"><input value={d.tag ?? ""} onChange={(e) => upd({ tag: e.target.value || null })} placeholder="Noel…" className="h-8 w-20 rounded-md border border-border px-2" /></td>
                    <td className="p-1.5">
                      <button onClick={() => setDeps((s) => s.filter((x) => x.key !== d.key))} className="rounded-md p-1 text-ink-muted hover:bg-hot-light hover:text-hot" aria-label="Xoá ngày">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setDeps((p) => [...p, { key: nk(), depart_date: "", adult: 0, old_adult: null, child: null, infant: null, com: null, seats: null, sold: null, tag: null }])}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-paper-dim"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm 1 dòng trống
        </button>
        <p className="text-[11.5px] text-ink-muted">Gõ nhanh giá theo nghìn: “12990” = 12.990.000đ. Ngày đã qua tự ẩn trên trang Sale, không cần xoá.</p>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 backdrop-blur sm:bottom-4 sm:left-auto sm:right-24 sm:rounded-2xl sm:border sm:shadow-float">
        <button onClick={save} disabled={saving} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand px-6 text-[14px] font-bold text-white disabled:opacity-60 sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu tour
        </button>
      </div>
    </div>
  );
}

function L({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <label className={cn("block text-[11.5px] font-bold text-ink-muted", span2 && "sm:col-span-2")}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** AI đọc lịch trình: link Drive / file Word-PDF-ảnh / chữ dán vào */
function AIReadBox({
  partners,
  defaultPartner,
  defaultLink,
  onResult,
}: {
  partners: string[];
  defaultPartner: string;
  defaultLink: string;
  onResult: (t: Record<string, unknown>, link: string, partner: string, fileName: string) => void;
}) {
  const [link, setLink] = useState(defaultLink);
  const [partner, setPartner] = useState(defaultPartner);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!link.trim() && !text.trim() && !file) return void toast.error("Dán link, chọn file hoặc dán chữ chương trình tour.");
    setBusy(true);
    try {
      let filePayload: { name: string; mime: string; data: string } | undefined;
      if (file) {
        if (file.size > 12 * 1024 * 1024) throw new Error("File quá lớn (tối đa 12MB).");
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(",")[1] ?? "");
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        filePayload = { name: file.name, mime: file.type || "application/octet-stream", data: b64 };
      }
      const res = await fetch("/api/admin/tours/ai-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: file ? "" : link, text, file: filePayload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "AI chưa đọc được");
      onResult(j.tour, file ? "" : link.trim(), partner.trim(), file?.name ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI chưa đọc được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2.5 rounded-2xl border-2 border-dashed border-teal/40 bg-teal-light/40 p-4">
      <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
        <Sparkles className="h-4 w-4 text-teal" /> AI đọc chương trình tour của đối tác
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link Google Drive / Docs (đã mở “Bất kỳ ai có link”)" className={inp} />
        <input list="partners-ai" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Tên đối tác" className={inp} />
        <datalist id="partners-ai">{partners.map((p) => <option key={p} value={p} />)}</datalist>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 font-bold text-ink">
          <FileUp className="h-4 w-4" /> {file ? file.name : "Hoặc chọn file Word / PDF / ảnh"}
          <input type="file" accept=".docx,.pdf,image/*,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {file && <button onClick={() => setFile(null)} className="text-ink-muted underline">bỏ file</button>}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Hoặc dán chữ chương trình tour vào đây…" className="w-full rounded-lg border border-border bg-white p-2.5 text-[13px] outline-none focus:border-teal" />
      <button onClick={run} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-sand px-4 text-[13px] font-bold text-white disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "AI đang đọc (10–40 giây)…" : "AI đọc & điền form"}
      </button>
      <p className="text-[11.5px] text-ink-muted">AI tách lịch trình từng ngày, điểm đến, ngày khởi hành + giá NL/TE/EB, bao gồm / không bao gồm, visa, điều khoản. Tên & hotline đối tác được bỏ khỏi nội dung gửi khách.</p>
    </section>
  );
}

function ItineraryEditor({ days, onChange }: { days: TourDay[]; onChange: (d: TourDay[]) => void }) {
  const upd = (i: number, p: Partial<TourDay>) => onChange(days.map((d, j) => (j === i ? { ...d, ...p } : d)));
  const move = (i: number, dir: -1 | 1) => {
    const n = [...days];
    const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <section className="space-y-2.5 rounded-2xl border border-border bg-white p-4">
      <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-teal-dark">Lịch trình · {days.length} ngày</h2>
      {days.map((d, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border p-2.5 sm:grid-cols-[52px_1fr]">
          <div className="flex items-start gap-1 sm:flex-col">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light text-[12px] font-extrabold text-teal-dark">N{i + 1}</span>
            <button onClick={() => move(i, -1)} className="rounded p-1 text-ink-muted hover:bg-paper-dim" aria-label="Lên"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => move(i, 1)} className="rounded p-1 text-ink-muted hover:bg-paper-dim" aria-label="Xuống"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button onClick={() => onChange(days.filter((_, j) => j !== i))} className="rounded p-1 text-ink-muted hover:bg-hot-light hover:text-hot" aria-label="Xoá ngày"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_1fr]">
            <input value={d.t} onChange={(e) => upd(i, { t: e.target.value })} placeholder="Tiêu đề ngày" className={inp} />
            <input value={d.meals} onChange={(e) => upd(i, { meals: e.target.value })} placeholder="Bữa ăn" className={inp} />
            <input value={d.hotel ?? ""} onChange={(e) => upd(i, { hotel: e.target.value })} placeholder="Nghỉ đêm" className={inp} />
            <textarea
              defaultValue={d.items.join("\n")}
              key={`${i}-${d.items.join("|").length}`}
              onBlur={(e) => upd(i, { items: lines(e.target.value) })}
              rows={Math.min(8, Math.max(3, d.items.length + 1))}
              placeholder="Mỗi dòng 1 hoạt động"
              className="w-full rounded-lg border border-border p-2.5 text-[13px] outline-none focus:border-teal sm:col-span-3"
            />
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...days, { t: "", meals: "", items: [], hotel: "" }])} className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-paper-dim">
        <Plus className="h-3.5 w-3.5" /> Thêm ngày
      </button>
    </section>
  );
}

/** MỞ THÊM NGÀY: chép giá / com / số chỗ từ 1 ngày mẫu, thêm từng ngày hoặc lặp theo thứ trong tuần. */
function OpenDates({ deps, today, onAdd }: { deps: TourDeparture[]; today: string; onAdd: (rows: TourDeparture[]) => void }) {
  const src = useMemo(() => [...deps].filter((d) => d.depart_date && d.adult).sort((a, b) => b.depart_date.localeCompare(a.depart_date)), [deps]);
  const [from, setFrom] = useState("");
  const [one, setOne] = useState("");
  const [wd, setWd] = useState(4);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const base = src.find((d) => d.depart_date === from) ?? src[0];
  const has = new Set(deps.map((d) => d.depart_date));

  function repeat() {
    if (!a || !b) return;
    const [y, m, d] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    const x = new Date(y, m - 1, d);
    const end = new Date(y2, m2 - 1, d2);
    const out: string[] = [];
    while (x <= end && out.length < 120) {
      const s = isoOf(x);
      if (x.getDay() === wd && s > today && !has.has(s)) out.push(s);
      x.setDate(x.getDate() + 1);
    }
    setPicked((p) => [...new Set([...p, ...out])].sort());
  }

  return (
    <div className="space-y-2.5 rounded-xl bg-paper p-3">
      <p className="text-[13px] font-bold text-ink">➕ Mở thêm ngày khởi hành — lịch trình giữ nguyên</p>
      <div className="flex flex-wrap items-end gap-2 text-[11.5px] font-semibold text-ink-muted">
        <label>
          Chép giá / com / số chỗ từ
          <select value={base?.depart_date ?? ""} onChange={(e) => setFrom(e.target.value)} className="mt-0.5 block h-9 rounded-lg border border-border bg-white px-2 text-[12.5px] text-ink">
            {src.map((d) => (
              <option key={d.depart_date} value={d.depart_date}>
                {dm(d.depart_date)}/{d.depart_date.slice(2, 4)} · {kk(d.adult)}{d.com != null ? ` · com ${kk(d.com)}` : ""}{d.seats ? ` · ${d.seats} chỗ` : ""}
              </option>
            ))}
            {!src.length && <option value="">— chưa có ngày mẫu: nhập giá ở bảng dưới —</option>}
          </select>
        </label>
        <label>
          Thêm 1 ngày
          <span className="mt-0.5 flex gap-1">
            <input type="date" value={one} min={today} onChange={(e) => setOne(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-2 text-ink" />
            <button onClick={() => one && one > today && !has.has(one) && setPicked((p) => [...new Set([...p, one])].sort())} className="h-9 rounded-lg border border-border bg-white px-3 font-bold text-ink">Thêm</button>
          </span>
        </label>
        <label>
          Hoặc lặp mỗi
          <select value={wd} onChange={(e) => setWd(Number(e.target.value))} className="mt-0.5 block h-9 rounded-lg border border-border bg-white px-2 text-ink">
            {WDL.map((x, i) => <option key={i} value={i}>{x}</option>)}
          </select>
        </label>
        <label>từ<input type="date" value={a} onChange={(e) => setA(e.target.value)} className="mt-0.5 block h-9 rounded-lg border border-border bg-white px-2 text-ink" /></label>
        <label>đến<input type="date" value={b} onChange={(e) => setB(e.target.value)} className="mt-0.5 block h-9 rounded-lg border border-border bg-white px-2 text-ink" /></label>
        <button onClick={repeat} className="h-9 rounded-lg border border-border bg-white px-3 font-bold text-ink">Tạo danh sách</button>
      </div>
      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {picked.map((d) => (
            <button key={d} onClick={() => setPicked((p) => p.filter((x) => x !== d))} className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-emerald-700" title="Bỏ ngày này">
              {d.split("-").reverse().join("/")} ✕
            </button>
          ))}
          <button
            disabled={!base}
            onClick={() => {
              if (!base) return;
              onAdd(picked.map((d) => ({ ...base, id: undefined, depart_date: d, sold: base.seats != null ? 0 : null, tag: null, old_adult: null })));
              toast.success(`Đã thêm ${picked.length} ngày (giá ${kk(base.adult)}) — bấm Lưu tour`);
              setPicked([]);
            }}
            className="ml-1 h-8 rounded-lg bg-gradient-to-r from-teal to-sand px-3 text-[12.5px] font-bold text-white disabled:opacity-50"
          >
            Mở {picked.length} ngày
          </button>
        </div>
      )}
    </div>
  );
}
