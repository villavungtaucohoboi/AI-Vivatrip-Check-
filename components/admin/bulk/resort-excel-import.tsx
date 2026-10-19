"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadResortTemplate, parseResortWorkbook, type ParsedHotel } from "@/lib/resort-excel";
import { cn } from "@/lib/utils";

type Status = { state: "new" | "partner" | "update" | "created" | "updated" | "failed"; id?: string | null; error?: string; partnerOf?: string | null };
const BATCH = 4;
const k = (n: number | null) => (n == null ? "—" : `${new Intl.NumberFormat("vi-VN").format(Math.round(n / 1000))}k`);
const d = (s: string | null) => (s ? s.split("-").reverse().join("/") : "—");
const TYPE = { resort: "Resort", hotel: "Khách sạn", homestay: "Homestay" } as const;

export function ResortExcelImport({ initialFile }: { initialFile?: File } = {}) {
  const [fileName, setFileName] = useState("");
  const [hotels, setHotels] = useState<ParsedHotel[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // KS cũ của đối tác không còn trong file mới → xoá cho khỏi trùng / chồng chéo
  const [prune, setPrune] = useState<{ id: string; name: string; source: string }[]>([]);
  const [doPrune, setDoPrune] = useState(true);
  const matchedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (initialFile) onFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setFileName(f.name);
    setStatus({});
    try {
      const { hotels: hs, error } = parseResortWorkbook(await f.arrayBuffer());
      if (error) {
        toast.error(error);
        setHotels([]);
        return;
      }
      setHotels(hs);
      setPicked(new Set(hs.filter((h) => !h.expired && h.rooms > 0).map((h) => h.resort.clientKey)));
      await check(hs, source);
    } catch {
      toast.error("Không đọc được file. Hãy lưu lại dạng .xlsx rồi thử lại.");
    }
  }

  const withSource = (h: ParsedHotel, src: string) => ({
    ...h.resort,
    info: { ...h.resort.info, price_source: h.resort.info.price_source || src.trim() || null },
  });
  // Hỏi web: khách sạn nào đã có CÙNG đối tác (cập nhật) / có ở đối tác khác (thêm đối tác) / mới
  async function check(hs: ParsedHotel[], src: string) {
    if (!hs.length) return;
    const res = await fetch("/api/admin/bulk/resort-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun: true, resorts: hs.map((h) => withSource(h, src)) }),
    });
    const j = await res.json().catch(() => ({}));
    setPrune(j.prune ?? []);
    matchedIds.current = new Set((j.matches ?? []).map((m: { id: string | null }) => m.id).filter(Boolean));
    if (j.matches) {
      setStatus(
        Object.fromEntries(
          j.matches.map((m: { key: string; id: string | null; partnerOf: string | null }) => [
            m.key,
            { state: m.id ? "update" : m.partnerOf ? "partner" : "new", id: m.id, partnerOf: m.partnerOf },
          ])
        )
      );
    }
  }

  async function runImport() {
    const list = hotels.filter((h) => picked.has(h.resort.clientKey));
    if (!list.length) return;
    setBusy(true);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH).map((h) => withSource(h, source));
      try {
        const res = await fetch("/api/admin/bulk/resort-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resorts: chunk }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Lỗi máy chủ");
        setStatus((s) => {
          const n = { ...s };
          for (const r of j.results as { key: string; id?: string; status: Status["state"]; error?: string }[]) {
            n[r.key] = { state: r.status, id: r.id, error: r.error };
            if (r.id) matchedIds.current.add(r.id);
            if (r.status !== "failed") ok++;
          }
          return n;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lỗi mạng";
        setStatus((s) => ({ ...s, ...Object.fromEntries(chunk.map((c) => [c.clientKey, { state: "failed" as const, error: msg }])) }));
      }
      setProgress({ done: Math.min(i + BATCH, list.length), total: list.length });
    }
    let deleted = 0;
    if (doPrune && prune.length) {
      const sources = [...new Set(hotels.map((h) => withSource(h, source).info.price_source).filter(Boolean))] as string[];
      const res = await fetch("/api/admin/bulk/resort-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prune: { sources, keepIds: [...matchedIds.current] } }),
      });
      const j = await res.json().catch(() => ({}));
      deleted = j.deleted ?? 0;
      if (!res.ok) toast.error(`Không xoá được KS cũ: ${j.error ?? "lỗi"}`);
      setPrune([]);
    }
    setBusy(false);
    toast.success(`Đã nhập ${ok}/${list.length} khách sạn${deleted ? ` · đã xoá ${deleted} KS cũ trùng/không còn trong file` : ""}.`);
  }

  const toggle = (key: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const expiredCount = hotels.filter((h) => h.expired).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal text-white">
            <Upload className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-ink">{fileName || "Chọn hoặc kéo thả file Excel bảng giá (.xlsx)"}</span>
            <span className="block text-[12.5px] text-ink-muted">Đúng mẫu chuẩn VivaTrip: 3 sheet Khách sạn · Giai đoạn · Phòng & giá</span>
          </span>
        </button>
        <button
          type="button"
          onClick={downloadResortTemplate}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-[13px] font-bold text-ink hover:bg-paper-dim"
        >
          <Download className="h-4 w-4" /> Tải file mẫu
        </button>
        <input ref={input} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {hotels.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3">
            <FileSpreadsheet className="h-5 w-5 text-teal" />
            <span className="text-[13px] font-bold text-ink">
              {hotels.length} khách sạn · đã chọn {picked.size}
            </span>
            <button type="button" onClick={() => setPicked(new Set(hotels.map((h) => h.resort.clientKey)))} className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-semibold">
              Chọn tất cả
            </button>
            <button type="button" onClick={() => setPicked(new Set(hotels.filter((h) => !h.expired).map((h) => h.resort.clientKey)))} className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-semibold">
              Bỏ {expiredCount} KS hết hạn
            </button>
            <button type="button" onClick={() => setPicked(new Set())} className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-semibold">
              Bỏ chọn
            </button>
            <label className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">
              Giá mua của (dòng nào trống):
              <input value={source} onChange={(e) => setSource(e.target.value)} onBlur={() => check(hotels, source)} placeholder="VD: Mustgo" className="h-8 w-36 rounded-lg border border-border px-2 text-[12.5px]" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[860px] text-[12.5px]">
              <thead className="bg-paper text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2">Khách sạn</th>
                  <th className="p-2">Khu vực</th>
                  <th className="p-2 text-center">GĐ</th>
                  <th className="p-2 text-center">Phòng</th>
                  <th className="p-2 text-right">Giá từ</th>
                  <th className="p-2">Hiệu lực đến</th>
                  <th className="p-2">Mua của</th>
                  <th className="p-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => {
                  const key = h.resort.clientKey;
                  const st = status[key];
                  const info = h.resort.info;
                  return (
                    <FragmentRow key={key}>
                      <tr className={cn("border-t border-border/70", h.expired && "bg-amber-50/60")}>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={picked.has(key)} onChange={() => toggle(key)} className="h-4 w-4 accent-teal" />
                        </td>
                        <td className="p-2">
                          <button type="button" onClick={() => setOpen(open === key ? null : key)} className="text-left">
                            <span className="font-bold text-ink">{info.product_name}</span>
                            {info.star ? <span className="ml-1 text-amber-500">{"★".repeat(info.star)}</span> : null}
                            <span className="block text-[11px] text-ink-muted">
                              {info.product_code} · {TYPE[info.type as keyof typeof TYPE]}
                              {h.warnings.length + (h.note.match(/•/g)?.length ?? 0) > 0 && <span className="ml-1 font-semibold text-amber-700">· {h.warnings.length + (h.note.match(/•/g)?.length ?? 0)} lưu ý ›</span>}
                            </span>
                          </button>
                        </td>
                        <td className="p-2">{info.area}</td>
                        <td className="p-2 text-center">{h.resort.periods.length}</td>
                        <td className="p-2 text-center">{h.rooms}</td>
                        <td className="p-2 text-right font-bold tabular-nums">{k(h.minPrice)}</td>
                        <td className={cn("p-2", h.expired && "font-bold text-hot")}>{d(h.validTo)}</td>
                        <td className="p-2 text-[11.5px] text-ink-muted">{info.price_source || source || "—"}</td>
                        <td className="p-2">
                          <StatusChip st={st} />
                        </td>
                      </tr>
                      {open === key && (
                        <tr className="bg-paper/60">
                          <td />
                          <td colSpan={8} className="space-y-1.5 p-3 text-[12px]">
                            {h.warnings.map((w, i) => (
                              <p key={i} className="flex gap-1.5 text-amber-800">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                              </p>
                            ))}
                            {h.note && <p className="whitespace-pre-line text-ink-muted">📝 {h.note}</p>}
                            <p className="text-ink-muted">
                              <b>Giai đoạn:</b>{" "}
                              {h.resort.periods
                                .map((p) => `${p.name}${p.ranges.length ? ` (${p.ranges.map((r) => `${d(r.from).slice(0, 5)}–${d(r.to)}`).join(", ")})` : p.holiday ? " (lịch lễ chung)" : ""}`)
                                .join(" · ")}
                            </p>
                            <p className="text-ink-muted">
                              <b>Phòng:</b> {h.resort.rooms.map((r) => r.room_type).join(" · ")}
                            </p>
                          </td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>

          {prune.length > 0 && (
            <label className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
              <input type="checkbox" checked={doPrune} onChange={(e) => setDoPrune(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal" />
              <span>
                <b>Xoá {prune.length} khách sạn cũ của đối tác này không còn trong file</b> (bản trùng tên cũ / đã bỏ) — tránh hiện trùng khi tìm kiếm:{" "}
                <span className="text-amber-800/80">{prune.slice(0, 12).map((p) => p.name).join(" · ")}{prune.length > 12 ? ` … +${prune.length - 12}` : ""}</span>
              </span>
            </label>
          )}

          <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-float backdrop-blur">
            <button
              type="button"
              disabled={busy || !picked.size}
              onClick={runImport}
              className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand px-5 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Nhập {picked.size} khách sạn vào web
            </button>
            {progress && (
              <span className="text-[12.5px] font-semibold text-ink-muted">
                {progress.done}/{progress.total} xong
              </span>
            )}
            <span className="text-[11.5px] text-ink-muted">Cùng khách sạn + cùng đối tác → cập nhật (giữ ảnh). Cùng khách sạn nhưng đối tác khác → thêm bản giá của đối tác đó; web tự hiện bên RẺ NHẤT, các bên khác nằm ở “Đối tác khác”.</span>
            <Link href="/admin/bulk/resort/edit" className="ml-auto text-[12.5px] font-bold text-teal-dark underline">
              Mở bảng giá để xem / sửa →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function StatusChip({ st }: { st?: Status }) {
  if (!st) return <span className="text-ink-muted">…</span>;
  const map = {
    new: ["Tạo mới", "bg-teal-light text-teal-dark"],
    partner: ["+ Đối tác mới", "bg-amber-50 text-amber-800"],
    update: ["Cập nhật", "bg-sky-50 text-sky-700"],
    created: ["✓ Đã tạo", "bg-emerald-50 text-emerald-700"],
    updated: ["✓ Đã cập nhật", "bg-emerald-50 text-emerald-700"],
    failed: ["Lỗi", "bg-red-50 text-hot"],
  } as const;
  const [label, cls] = map[st.state];
  return (
    <span title={st.error} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", cls)}>
      {st.state === "failed" ? <XCircle className="h-3 w-3" /> : st.state.endsWith("ed") ? <CheckCircle2 className="h-3 w-3" /> : null}
      {label}
      {st.error && <span className="max-w-[160px] truncate font-medium">: {st.error}</span>}
      {st.state === "partner" && st.partnerOf && <span className="max-w-[170px] truncate font-medium" title={st.partnerOf}>· đã có: {st.partnerOf}</span>}
    </span>
  );
}
