"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2, RotateCcw, Search, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { BulkSaveBar, useUnsavedGuard } from "@/components/admin/bulk/bulk-ui";
import { cn } from "@/lib/utils";

export interface NoteRow {
  id: string;
  code: string;
  name: string;
  area: string;
  type: string;
  note: string;
  /** Bản gốc trước khi rút gọn (cột note_original) — null nếu chưa rút gọn lần nào */
  original: string | null;
}

interface Row extends NoteRow {
  draft: string;
  /** Bản gốc sẽ được lưu kèm khi bấm Lưu (lần đầu rút gọn căn này) */
  pendingOriginal: string | null;
  busy: boolean;
  engine?: "ai" | "basic";
}

const TYPE_LABEL: Record<string, string> = { villa: "Villa", resort: "Resort", hotel: "Hotel" };

function plain(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

async function summarize(text: string): Promise<{ summary: string; engine: "ai" | "basic" }> {
  const res = await fetch("/api/admin/summarize-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok || !data.summary) throw new Error(data.error || "Không rút gọn được");
  return data;
}

export function NotesBulk({ initial }: { initial: NoteRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({ ...r, draft: r.note, pendingOriginal: null, busy: false }))
  );
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "villa" | "resort">("villa");
  const [onlyUnsummarized, setOnlyUnsummarized] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const nq = plain(q.trim());
    return rows.filter(
      (r) =>
        r.note.trim().length > 0 &&
        (type === "all" || (type === "villa" ? r.type === "villa" : r.type !== "villa")) &&
        (!onlyUnsummarized || r.original == null) &&
        (!nq || plain(`${r.name} ${r.code} ${r.area}`).includes(nq))
    );
  }, [rows, q, type, onlyUnsummarized]);

  const dirty = rows.filter((r) => r.draft !== r.note);
  useUnsavedGuard(dirty.length > 0);

  const patch = (id: string, p: Partial<Row>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function summarizeOne(r: Row) {
    // Luôn rút gọn từ bản ĐẦY ĐỦ nhất: bản gốc đã lưu, nếu chưa có thì nội dung hiện tại
    const source = r.original ?? r.note;
    patch(r.id, { busy: true });
    try {
      const { summary, engine } = await summarize(source);
      patch(r.id, { draft: summary, engine, busy: false, pendingOriginal: r.original == null ? r.note : null });
      return true;
    } catch (e) {
      patch(r.id, { busy: false });
      toast.error(`${r.name}: ${e instanceof Error ? e.message : "lỗi"}`);
      return false;
    }
  }

  async function summarizeSelected() {
    const targets = rows.filter((r) => selected.has(r.id));
    if (!targets.length) return;
    cancelRef.current = false;
    setProgress({ done: 0, total: targets.length });
    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      if (await summarizeOne(targets[i])) ok++;
      setProgress({ done: i + 1, total: targets.length });
      await new Promise((r) => setTimeout(r, 250)); // nhẹ tay với giới hạn lượt của AI miễn phí
    }
    setProgress(null);
    toast.success(`Đã rút gọn ${ok}/${targets.length} căn — xem lại rồi bấm Lưu.`);
  }

  async function saveAll() {
    if (!dirty.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bulk/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: dirty.map((r) => ({ id: r.id, note: r.draft, original: r.pendingOriginal })) }),
      });
      const data = (await res.json()) as { saved?: number; failed?: { id: string }[]; originalSupported?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      const failedIds = new Set((data.failed ?? []).map((f) => f.id));
      setRows((prev) =>
        prev.map((r) =>
          r.draft !== r.note && !failedIds.has(r.id)
            ? {
                ...r,
                note: r.draft,
                original: data.originalSupported ? r.original ?? r.pendingOriginal : r.original,
                pendingOriginal: null,
              }
            : r
        )
      );
      toast.success(`Đã lưu ${data.saved ?? 0} căn${failedIds.size ? `, ${failedIds.size} căn lỗi` : ""}.`);
      if (data.originalSupported === false) {
        toast.warning("Chưa chạy SQL 0025_note_original nên chưa lưu được bản gốc — chỉ hoàn tác được trước khi tải lại trang.");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  return (
    <div className="pb-28">
      {/* Thanh công cụ */}
      <div className="sticky top-0 z-20 -mx-4 space-y-2 border-b border-border bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên / mã / khu vực…"
              className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-teal"
            />
          </div>
          {(["villa", "resort", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "h-10 rounded-xl px-3 text-[12.5px] font-bold",
                type === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted"
              )}
            >
              {t === "villa" ? "Villa" : t === "resort" ? "Resort/Hotel" : "Tất cả"}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
            <input type="checkbox" checked={onlyUnsummarized} onChange={(e) => setOnlyUnsummarized(e.target.checked)} className="h-4 w-4 accent-[#EF4F58]" />
            Chỉ căn chưa rút gọn
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
                  else visible.forEach((r) => next.add(r.id));
                  return next;
                })
              }
              className="h-4 w-4 accent-[#EF4F58]"
            />
            Chọn tất cả ({visible.length})
          </label>
          {progress ? (
            <>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-dark">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang rút gọn {progress.done}/{progress.total}…
              </span>
              <button onClick={() => (cancelRef.current = true)} className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12px] font-bold text-ink">
                <Square className="h-3 w-3" /> Dừng
              </button>
            </>
          ) : (
            <button
              disabled={selected.size === 0}
              onClick={summarizeSelected}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-dark to-teal px-4 py-2 text-[13px] font-bold text-white shadow-sm disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" /> Rút gọn {selected.size} căn đã chọn
            </button>
          )}
        </div>
      </div>

      {/* Danh sách căn */}
      <div className="mt-3 space-y-2.5">
        {visible.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">Không có căn nào có nội dung phù hợp.</p>}
        {visible.map((r) => {
          const changed = r.draft !== r.note;
          const canRestore = r.original != null && r.draft !== r.original;
          return (
            <div key={r.id} className={cn("rounded-2xl border bg-white p-3", changed ? "border-sand ring-1 ring-sand/40" : "border-border")}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(r.id)) next.delete(r.id);
                      else next.add(r.id);
                      return next;
                    })
                  }
                  className="h-4 w-4 accent-[#EF4F58]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{r.name}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {TYPE_LABEL[r.type] ?? r.type} · {r.area}
                    {r.code ? ` · ${r.code}` : ""} · {r.note.length} → <b className={changed ? "text-sand-dark" : ""}>{r.draft.length}</b> ký tự
                    {r.original != null && <span className="ml-1 rounded bg-teal-light px-1 font-semibold text-teal-dark">đã rút gọn</span>}
                    {changed && <span className="ml-1 rounded bg-sand-light px-1 font-semibold text-sand-dark">chưa lưu</span>}
                    {r.engine && changed && <span className="ml-1 text-[10.5px]">({r.engine === "ai" ? "AI" : "lọc miễn phí"})</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    disabled={r.busy || !!progress}
                    onClick={() => summarizeOne(r)}
                    className="flex items-center gap-1 rounded-lg bg-teal-light px-2.5 py-1.5 text-[12px] font-bold text-teal-dark disabled:opacity-50"
                  >
                    {r.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Rút gọn
                  </button>
                  {changed && (
                    <button
                      onClick={() => patch(r.id, { draft: r.note, pendingOriginal: null, engine: undefined })}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-bold text-ink-muted"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Hoàn tác
                    </button>
                  )}
                  {canRestore && (
                    <button
                      onClick={() => patch(r.id, { draft: r.original!, pendingOriginal: null, engine: undefined })}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-bold text-ink-muted"
                      title="Đưa nội dung về bản gốc trước khi rút gọn"
                    >
                      <History className="h-3.5 w-3.5" /> Khôi phục bản gốc
                    </button>
                  )}
                </div>
              </div>

              {(changed || r.busy) && (
                <div className="mt-2.5 grid gap-2 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Đang lưu hiện tại</p>
                    <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-xl bg-paper-dim p-2.5 text-[12.5px] text-ink-muted">{r.note}</div>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-teal-dark">Bản mới (sửa tay được)</p>
                    <textarea
                      value={r.draft}
                      onChange={(e) => patch(r.id, { draft: e.target.value })}
                      rows={9}
                      className="w-full rounded-xl border border-teal/40 bg-white p-2.5 text-[13px] leading-relaxed text-ink outline-none focus:ring-2 focus:ring-teal/20"
                    />
                  </div>
                </div>
              )}
              {!changed && !r.busy && (
                <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[12.5px] text-ink-muted">{r.note}</p>
              )}
            </div>
          );
        })}
      </div>

      <BulkSaveBar
        show={dirty.length > 0}
        message={
          <>
            Đã đổi nội dung <b className="text-sand-dark">{dirty.length} căn</b> — chưa lưu
          </>
        }
        onSave={saveAll}
        onUndo={() => setRows((prev) => prev.map((r) => ({ ...r, draft: r.note, pendingOriginal: null, engine: undefined })))}
        saving={saving}
      />
    </div>
  );
}
