"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { matchProgram, parseTourWorkbook, type ExcelProgram } from "@/lib/tour-excel";
import { dm, isFull, kk, left, norm, upcoming } from "@/lib/tour-utils";
import type { TourDeparture, TourWithDeps } from "@/lib/tour-types";
import { cn } from "@/lib/utils";

type Action = { kind: "update"; tourId: string } | { kind: "clone"; tourId: string } | { kind: "skip" };
type DiffKind = "add" | "chg" | "seat" | "same" | "del";

/** TE/EB không có trong file số chỗ → lấy theo tour hiện tại (cùng ngày, hoặc cùng mức giá NL / giá gạch). */
function fillChild(rows: TourDeparture[], tour: TourWithDeps | undefined): TourDeparture[] {
  if (!tour) return rows;
  const byDate = new Map(tour.departures.map((d) => [d.depart_date, d]));
  const byPrice = new Map<number, TourDeparture>();
  for (const d of tour.departures) {
    if (d.child != null && !byPrice.has(d.adult)) byPrice.set(d.adult, d);
    if (d.child != null && d.old_adult && !byPrice.has(d.old_adult)) byPrice.set(d.old_adult, d);
  }
  return rows.map((r) => {
    if (r.child != null && r.infant != null) return r;
    const ref = byDate.get(r.depart_date)?.child != null ? byDate.get(r.depart_date) : byPrice.get(r.old_adult ?? r.adult) ?? byPrice.get(r.adult);
    return { ...r, child: r.child ?? ref?.child ?? null, infant: r.infant ?? ref?.infant ?? null };
  });
}

export function TourExcelImport({ tours, today, loadError }: { tours: TourWithDeps[]; today: string; loadError?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [partner, setPartner] = useState("");
  const [programs, setPrograms] = useState<ExcelProgram[]>([]);
  const [sheets, setSheets] = useState<{ name: string; text: string; found: number }[]>([]);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiSheet, setAiSheet] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const partners = useMemo(() => [...new Set(tours.map((t) => t.partner ?? "").filter(Boolean))].sort(), [tours]);

  function autoActions(ps: ExcelProgram[], p: string) {
    const out: Record<string, Action> = {};
    const pool = tours.filter((t) => !p || norm(t.partner ?? "") === norm(p));
    for (const pr of ps) {
      const m = matchProgram(pr, pool.length ? pool : tours, p) ?? null;
      if (m) out[pr.key] = { kind: "update", tourId: m.id };
      else {
        // chưa có tour khớp → gợi ý nhân bản từ tour gần giống nhất (VD bản "Kích cầu")
        const loose = (pool.length ? pool : tours)
          .map((t) => ({ t, s: norm(pr.name).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && norm(`${t.name} ${t.route_text} ${(t.places ?? []).join(" ")}`).includes(w)).length }))
          .sort((a, b) => b.s - a.s)[0];
        out[pr.key] = loose && loose.s >= 2 ? { kind: "clone", tourId: loose.t.id } : { kind: "skip" };
      }
    }
    return out;
  }

  async function onFile(f?: File) {
    if (!f) return;
    setFileName(f.name);
    setDone({});
    try {
      const { programs: ps, sheets: ss } = parseTourWorkbook(await f.arrayBuffer(), today);
      setPrograms(ps);
      setSheets(ss);
      // đoán đối tác từ tên file nếu trùng đối tác đã có
      const guess = partner || partners.find((p) => norm(f.name).includes(norm(p))) || "";
      setPartner(guess);
      setActions(autoActions(ps, guess));
      if (!ps.length) toast.message("Không tự đọc được bảng nào — chọn sheet để AI đọc.");
      else toast.success(`Đọc được ${ps.length} chương trình, ${ps.reduce((a, p) => a + p.rows.length, 0)} ngày khởi hành.`);
    } catch {
      toast.error("Không đọc được file. Lưu lại dạng .xlsx rồi thử lại.");
    }
  }

  async function aiRead(sheetName: string) {
    const s = sheets.find((x) => x.name === sheetName);
    if (!s) return;
    setAiSheet(sheetName);
    try {
      const res = await fetch("/api/admin/tours/excel-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: s.text }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const add: ExcelProgram[] = (j.programs as Record<string, unknown>[]).map((p, i) => ({
        key: `${sheetName}|ai${i}`,
        sheet: sheetName,
        name: String(p.name ?? sheetName),
        detail: "",
        duration: String(p.duration ?? ""),
        days: Number(String(p.duration ?? "").match(/\d+/)?.[0]) || null,
        airline: String(p.airline ?? ""),
        rows: ((p.rows as Record<string, unknown>[]) ?? [])
          .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r.date)) && Number(r.adult) > 0)
          .map((r) => ({
            depart_date: String(r.date),
            adult: Number(r.adult),
            old_adult: r.old_adult ? Number(r.old_adult) : null,
            child: r.child ? Number(r.child) : null,
            infant: r.infant ? Number(r.infant) : null,
            com: r.com ? Number(r.com) : null,
            seats: r.seats != null ? Number(r.seats) : null,
            sold: r.sold != null ? Number(r.sold) : null,
            tag: (r.tag as string) || null,
          })),
      }));
      setPrograms((p) => [...p.filter((x) => x.sheet !== sheetName), ...add]);
      setActions((a) => ({ ...a, ...autoActions(add, partner) }));
      toast.success(`AI đọc được ${add.length} chương trình ở sheet ${sheetName}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI chưa đọc được");
    } finally {
      setAiSheet(null);
    }
  }

  function diff(pr: ExcelProgram, tour: TourWithDeps | undefined) {
    const next = new Map(pr.rows.filter((r) => r.depart_date > today).map((r) => [r.depart_date, r]));
    const cur = new Map(upcoming(tour?.departures ?? [], today).map((d) => [d.depart_date, d]));
    const out: { date: string; n?: TourDeparture; c?: TourDeparture; kind: DiffKind }[] = [];
    for (const [date, n] of next) {
      const c = cur.get(date);
      out.push({ date, n, c, kind: !c ? "add" : c.adult !== n.adult ? "chg" : c.com !== n.com || left(c) !== left(n) ? "seat" : "same" });
    }
    if (mode === "replace") for (const [date, c] of cur) if (!next.has(date)) out.push({ date, c, kind: "del" });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  async function apply() {
    if (!partner.trim()) return void toast.error("Nhập tên đối tác của file này (để thay đúng file cũ của đối tác đó).");
    setBusy(true);
    const result: Record<string, string> = {};
    try {
      const updates = programs
        .map((pr) => ({ pr, a: actions[pr.key] }))
        .filter((x) => x.a?.kind === "update") as { pr: ExcelProgram; a: { kind: "update"; tourId: string } }[];
      // gộp các chương trình trỏ cùng 1 tour
      const byTour = new Map<string, TourDeparture[]>();
      for (const { pr, a } of updates) {
        const t = tours.find((x) => x.id === a.tourId);
        byTour.set(a.tourId, [...(byTour.get(a.tourId) ?? []), ...fillChild(pr.rows, t)]);
      }
      if (byTour.size) {
        const res = await fetch("/api/admin/tours/departures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [...byTour.entries()].map(([tourId, departures]) => ({ tourId, departures, mode })) }),
        });
        const j = await res.json();
        for (const r of j.results ?? []) for (const { pr, a } of updates) if (a.tourId === r.tourId) result[pr.key] = r.error ? `Lỗi: ${r.error}` : `✓ Đã cập nhật ${r.saved} ngày`;
      }
      // nhân bản tour cho chương trình mới (giữ lịch trình, chỉ thay ngày & giá)
      for (const pr of programs) {
        const a = actions[pr.key];
        if (a?.kind !== "clone") continue;
        const src = tours.find((t) => t.id === a.tourId);
        if (!src) continue;
        const suffix = pr.name.match(/\(([^)]+)\)/)?.[1];
        const { id: _id, departures: _d, ...rest } = src;
        const res = await fetch("/api/admin/tours/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tour: {
              ...rest,
              code: null,
              name: suffix ? `${src.name} (${suffix.charAt(0).toUpperCase()}${suffix.slice(1).toLowerCase()})` : `${src.name} – ${pr.name}`.slice(0, 160),
              partner: partner.trim(),
              partner_file: fileName,
            },
            departures: fillChild(pr.rows, src),
            mode: "replace",
          }),
        });
        const j = await res.json();
        result[pr.key] = res.ok ? `✓ Đã tạo tour mới (${j.departures} ngày)` : `Lỗi: ${j.error}`;
      }
      setDone(result);
      toast.success("Đã áp dụng file Excel vào web.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi áp dụng");
    } finally {
      setBusy(false);
    }
  }

  const pill = (k: DiffKind) =>
    ({ add: "bg-emerald-50 text-emerald-700", chg: "bg-amber-50 text-amber-800", seat: "bg-sky-50 text-sky-700", same: "bg-paper-dim text-ink-muted", del: "bg-hot-light text-hot" })[k];
  const label: Record<DiffKind, string> = { add: "Mới", chg: "Đổi giá", seat: "Chỗ/com", same: "=", del: "Bỏ" };
  const nApply = programs.filter((p) => actions[p.key] && actions[p.key].kind !== "skip").length;

  return (
    <div className="space-y-4 pb-24">
      <Link href="/admin/tours" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Danh sách tour
      </Link>
      <div>
        <h1 className="font-display text-2xl text-ink">Up file Excel giá & số chỗ của đối tác</h1>
        <p className="mt-1 text-sm text-ink-muted">
          File nhiều tab (mỗi tab 1 tuyến) có cột Chương trình · Ngày đi · Giá bán · Com · Tổng chỗ · Đã bán / Còn nhận. Web tự ghép vào tour đã có; chương trình mới (VD “Kích cầu”) được nhân bản từ tour cùng lịch trình.
        </p>
      </div>
      {loadError && <p className="rounded-xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">{loadError}</p>}

      <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
          className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-teal/40 bg-teal-light/40 p-5 text-left hover:bg-teal-light"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal text-white"><Upload className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-ink">{fileName || "Chọn hoặc kéo thả file Excel (.xlsx)"}</span>
            <span className="block text-[12.5px] text-ink-muted">Google Sheets: Tệp → Tải xuống → Microsoft Excel</span>
          </span>
        </button>
        <label className="rounded-2xl border border-border bg-white p-3 text-[12px] font-bold text-ink-muted">
          Đối tác của file *
          <input
            list="xls-partners"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            onBlur={() => programs.length && setActions(autoActions(programs, partner))}
            placeholder="VD: Postours"
            className="mt-1 h-10 w-full rounded-lg border border-border px-2.5 text-[13.5px] font-semibold text-ink outline-none focus:border-teal"
          />
          <datalist id="xls-partners">{partners.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <input ref={input} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {sheets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sheets.map((s) => (
            <span key={s.name} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold", s.found ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-white text-ink-muted")}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> {s.name} {s.found ? `· ${s.found} ngày` : ""}
              {!s.found && s.text.length > 50 && (
                <button onClick={() => aiRead(s.name)} disabled={!!aiSheet} className="ml-1 flex items-center gap-0.5 rounded-full bg-teal px-2 text-[11px] font-bold text-white">
                  {aiSheet === s.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI đọc
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {programs.map((pr) => {
        const a = actions[pr.key] ?? { kind: "skip" };
        const target = a.kind !== "skip" ? tours.find((t) => t.id === a.tourId) : undefined;
        const d = a.kind === "update" ? diff(pr, target) : pr.rows.filter((r) => r.depart_date > today).map((n) => ({ date: n.depart_date, n, c: undefined, kind: "add" as DiffKind }));
        const cnt = (k: DiffKind) => d.filter((x) => x.kind === k).length;
        const past = pr.rows.filter((r) => r.depart_date <= today).length;
        return (
          <section key={pr.key} className={cn("space-y-2 rounded-2xl border bg-white p-3.5", a.kind === "skip" ? "border-border opacity-70" : "border-teal/30")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-ink">{pr.name}</p>
                <p className="text-[11.5px] text-ink-muted">
                  Tab {pr.sheet}{pr.duration ? ` · ${pr.duration}` : ""}{pr.airline ? ` · ${pr.airline}` : ""} · {pr.rows.length} ngày{past ? ` (${past} ngày đã qua bỏ qua)` : ""}
                </p>
              </div>
              <select
                value={a.kind === "skip" ? "skip" : `${a.kind}:${a.tourId}`}
                onChange={(e) => {
                  const v = e.target.value;
                  setActions((s) => ({ ...s, [pr.key]: v === "skip" ? { kind: "skip" } : { kind: v.split(":")[0] as "update" | "clone", tourId: v.split(":")[1] } }));
                }}
                className="h-9 max-w-full rounded-lg border border-border bg-white px-2 text-[12.5px] font-semibold"
              >
                <option value="skip">— Bỏ qua —</option>
                <optgroup label="Cập nhật ngày & giá vào tour">
                  {tours.map((t) => <option key={t.id} value={`update:${t.id}`}>{t.name} · {t.partner || "?"}</option>)}
                </optgroup>
                <optgroup label="Tạo tour mới = nhân bản lịch trình từ">
                  {tours.map((t) => <option key={t.id} value={`clone:${t.id}`}>⧉ {t.name} · {t.partner || "?"}</option>)}
                </optgroup>
              </select>
            </div>
            {a.kind !== "skip" && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold">
                {a.kind === "clone" && <span className="rounded bg-teal-light px-1.5 py-0.5 text-teal-dark">Tour mới · giữ lịch trình “{target?.name}”</span>}
                <span className={cn("rounded px-1.5 py-0.5", pill("add"))}>+{cnt("add")} mới</span>
                {a.kind === "update" && (
                  <>
                    <span className={cn("rounded px-1.5 py-0.5", pill("chg"))}>{cnt("chg")} đổi giá</span>
                    <span className={cn("rounded px-1.5 py-0.5", pill("seat"))}>{cnt("seat")} cập nhật chỗ/com</span>
                    {mode === "replace" && <span className={cn("rounded px-1.5 py-0.5", pill("del"))}>−{cnt("del")} bỏ</span>}
                    <span className={cn("rounded px-1.5 py-0.5", pill("same"))}>{cnt("same")} giữ nguyên</span>
                  </>
                )}
                <button onClick={() => setOpen(open === pr.key ? null : pr.key)} className="ml-1 text-teal-dark underline">{open === pr.key ? "Ẩn chi tiết" : "Xem từng ngày"}</button>
                {done[pr.key] && <span className="ml-auto flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {done[pr.key]}</span>}
              </div>
            )}
            {open === pr.key && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[12.5px] tabular-nums">
                  <thead className="text-left text-[10.5px] uppercase text-ink-muted">
                    <tr><th className="py-1">Ngày</th><th /><th className="text-right">Web hiện tại</th><th className="text-right">Trong file</th><th className="text-right">Com</th><th className="text-right">Còn chỗ</th></tr>
                  </thead>
                  <tbody>
                    {d.map((x) => (
                      <tr key={x.date} className="border-t border-border/60">
                        <td className="py-1">{dm(x.date)}/{x.date.slice(2, 4)}</td>
                        <td><span className={cn("rounded px-1.5 text-[10.5px] font-bold", pill(x.kind))}>{label[x.kind]}</span></td>
                        <td className={cn("text-right", x.kind === "del" && "text-hot line-through")}>{x.c ? kk(x.c.adult) : "—"}</td>
                        <td className="text-right font-semibold">{x.n ? <>{kk(x.n.adult)}{x.n.old_adult ? <s className="ml-1 text-[10.5px] text-ink-muted">{kk(x.n.old_adult)}</s> : null}</> : "—"}</td>
                        <td className="text-right">{x.n ? kk(x.n.com) : "—"}</td>
                        <td className="text-right">{x.n && left(x.n) != null ? (isFull(x.n) ? "Hết" : left(x.n)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {programs.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["replace", "Thay thế file cũ của đối tác (khuyên dùng)", "Ngày nào không còn trong file mới thì xoá → không chồng chéo"],
              ["merge", "Chỉ cập nhật + thêm ngày mới", "Giữ lại ngày cũ không có trong file"],
            ] as const).map(([v, t, s]) => (
              <label key={v} className={cn("flex cursor-pointer gap-2 rounded-xl border p-3 text-[13px]", mode === v ? "border-teal bg-teal-light/60" : "border-border bg-white")}>
                <input type="radio" checked={mode === v} onChange={() => setMode(v)} className="mt-0.5 accent-teal" />
                <span><b>{t}</b><span className="block text-[12px] text-ink-muted">{s}</span></span>
              </label>
            ))}
          </div>
          <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-float backdrop-blur">
            <button onClick={apply} disabled={busy || !nApply} className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand px-5 text-[14px] font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Áp dụng {nApply} chương trình
            </button>
            <span className="text-[12px] text-ink-muted">Giá trẻ em / em bé không có trong file → giữ theo tour hiện tại (cùng mức giá).</span>
            <Link href="/tours" className="ml-auto text-[12.5px] font-bold text-teal-dark underline">Xem trang Tour →</Link>
          </div>
        </>
      )}
    </div>
  );
}
