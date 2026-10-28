"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FolderOpen, Loader2, Square, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { R2_PUBLIC_URL } from "@/lib/img-url";
import { cn } from "@/lib/utils";

export interface VillaImgRow {
  id: string;
  code: string;
  name: string;
  area: string;
  type: string;
  images: string[];
}

type Status = { kind: "idle" | "work" | "done" | "error"; text?: string; done?: number };
interface Group {
  folder: string;
  files: File[];
  productId: string; // "" = chưa ghép
  auto: boolean;
}

const LARGE = 1280; // ảnh xem / gửi khách (~120-180KB)
const THUMB = 480; // ảnh nhỏ cho danh sách (~20-30KB)
const PARALLEL = 4;
const DONE_KEY = "vivatrip-r2-done-v1";

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const slug = (s: string) => plain(s).replace(/\s+/g, "-").slice(0, 60) || "can";
const natural = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

/** Ghép tên thư mục với căn: trùng mã → trùng tên → chứa nhau → trùng nhiều chữ nhất. */
function matchFolder(folder: string, rows: VillaImgRow[]): string {
  const f = plain(folder);
  const fc = f.replace(/\s/g, "");
  const byCode = rows.find((r) => r.code && plain(r.code).replace(/\s/g, "") === fc);
  if (byCode) return byCode.id;
  const byName = rows.find((r) => plain(r.name) === f);
  if (byName) return byName.id;
  const contain = rows.filter((r) => (r.code && fc.includes(plain(r.code).replace(/\s/g, "")) && plain(r.code).length >= 4) || (plain(r.name).length >= 5 && (f.includes(plain(r.name)) || plain(r.name).includes(f))));
  if (contain.length === 1) return contain[0].id;
  const fw = new Set(f.split(" ").filter((w) => w.length >= 2));
  let best = { id: "", score: 0 };
  for (const r of rows) {
    const rw = new Set(plain(`${r.name} ${r.code}`).split(" ").filter((w) => w.length >= 2));
    let inter = 0;
    fw.forEach((w) => rw.has(w) && inter++);
    const score = inter / Math.max(fw.size, 1);
    if (score > best.score) best = { id: r.id, score };
  }
  return best.score >= 0.67 ? best.id : "";
}

/** Nén 1 ảnh về cạnh dài `max`, ưu tiên WebP (Safari cũ không hỗ trợ → JPEG). */
async function shrink(file: File, max: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const toBlob = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, quality));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpg = await toBlob("image/jpeg");
  if (!jpg) throw new Error("Không nén được ảnh");
  return jpg;
}

async function put(url: string, blob: Blob) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": blob.type, "Cache-Control": "public, max-age=31536000, immutable" } });
      if (res.ok) return;
      if (res.status === 403) throw new Error("R2 từ chối (403) — kiểm tra mã R2 trên Vercel");
    } catch (e) {
      if (i === 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  throw new Error("Up ảnh thất bại");
}

function loadDone(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveDone(d: Record<string, number>) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(d));
  } catch {
    /* bỏ qua */
  }
}

export function VillaImagesBulk({ initial }: { initial: VillaImgRow[] }) {
  const [rows, setRows] = useState(initial);
  const [scope, setScope] = useState<"villa" | "all">("villa");
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [skipDone, setSkipDone] = useState(true);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({ files: 0, done: 0, bytes: 0, start: 0 });
  const cancel = useRef(false);
  const pool = useMemo(() => rows.filter((r) => scope === "all" || r.type === "villa"), [rows, scope]);
  const done = useMemo(() => (typeof window === "undefined" ? {} : loadDone()), [status]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPick(list: FileList | null) {
    if (!list?.length) return;
    const map = new Map<string, File[]>();
    for (const f of Array.from(list)) {
      if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) continue;
      const parts = (f.webkitRelativePath || f.name).split("/");
      const folder = parts.length >= 3 ? parts[1] : parts[0];
      map.set(folder, [...(map.get(folder) ?? []), f]);
    }
    const gs: Group[] = [...map.entries()]
      .map(([folder, files]) => {
        const id = matchFolder(folder, pool);
        return { folder, files: files.sort((a, b) => natural.compare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name)), productId: id, auto: !!id };
      })
      .sort((a, b) => natural.compare(a.folder, b.folder));
    setGroups(gs);
    setStatus({});
    const ok = gs.filter((g) => g.productId).length;
    toast.success(`${gs.length} thư mục · ${gs.reduce((a, g) => a + g.files.length, 0)} ảnh · tự ghép được ${ok} căn`);
  }

  const doneKey = (g: Group) => `${g.productId}|${g.folder}|${g.files.length}`;
  const todo = groups.filter((g) => g.productId && !(skipDone && done[doneKey(g)]));

  async function run() {
    if (!todo.length) return void toast.message("Không có thư mục nào cần up.");
    cancel.current = false;
    setRunning(true);
    const total = todo.reduce((a, g) => a + g.files.length, 0);
    setStats({ files: total, done: 0, bytes: 0, start: Date.now() });
    let okCount = 0;
    for (const g of todo) {
      if (cancel.current) break;
      const row = rows.find((r) => r.id === g.productId)!;
      const set = (s: Status) => setStatus((p) => ({ ...p, [g.folder]: s }));
      set({ kind: "work", done: 0, text: "Đang nén & up…" });
      try {
        const stamp = Date.now().toString(36);
        const base = `villa/${slug(row.code || row.name)}`;
        // xin link up cho cả căn 1 lần (ảnh to + ảnh nhỏ)
        const names = g.files.map((_, i) => `${base}/${String(i + 1).padStart(2, "0")}-${stamp}`);
        const urls: string[] = new Array(g.files.length);
        let n = 0;
        let next = 0;
        let failed = 0;
        const presigned = new Map<string, string>();
        const getLinks = async (keys: string[]) => {
          const res = await fetch("/api/admin/r2/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys }) });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error || "Không xin được link up");
          for (const [k, v] of Object.entries(j.urls as Record<string, string>)) presigned.set(k, v);
        };
        // đuôi file biết sau khi nén → xin link cho cả .webp và .jpg
        const allKeys = names.flatMap((k) => [`${k}.webp`, `${k}_t.webp`, `${k}.jpg`, `${k}_t.jpg`]);
        for (let i = 0; i < allKeys.length; i += 150) await getLinks(allKeys.slice(i, i + 150));
        const worker = async () => {
          while (next < g.files.length && !cancel.current) {
            const i = next++;
            try {
              const big = await shrink(g.files[i], LARGE, 0.8);
              const small = await shrink(g.files[i], THUMB, 0.72);
              const ext = big.type === "image/webp" ? "webp" : "jpg";
              const ext2 = small.type === "image/webp" ? "webp" : "jpg";
              if (ext !== ext2) throw new Error("định dạng lệch");
              await Promise.all([put(presigned.get(`${names[i]}.${ext}`)!, big), put(presigned.get(`${names[i]}_t.${ext}`)!, small)]);
              urls[i] = `${R2_PUBLIC_URL}/${names[i]}.${ext}`;
              setStats((s) => ({ ...s, done: s.done + 1, bytes: s.bytes + big.size + small.size }));
            } catch {
              failed++;
              setStats((s) => ({ ...s, done: s.done + 1 }));
            }
            set({ kind: "work", done: ++n, text: `${n}/${g.files.length} ảnh` });
          }
        };
        await Promise.all(Array.from({ length: PARALLEL }, worker));
        if (cancel.current) {
          set({ kind: "error", text: "Đã dừng" });
          break;
        }
        const ok = urls.filter(Boolean);
        if (!ok.length) throw new Error("Không up được ảnh nào (ảnh HEIC? mạng?)");
        const final = mode === "replace" ? ok : [...row.images, ...ok];
        const res = await fetch(`/api/admin/products/${row.id}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrls: final }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Không lưu được danh sách ảnh");
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, images: final } : r)));
        const d = loadDone();
        d[doneKey(g)] = Date.now();
        saveDone(d);
        okCount++;
        set({ kind: "done", text: `✓ ${ok.length} ảnh${failed ? ` · ${failed} ảnh lỗi (bỏ qua)` : ""}` });
      } catch (e) {
        set({ kind: "error", text: e instanceof Error ? e.message : "Lỗi" });
        if (/R2|Vercel|403/.test(String(e))) {
          toast.error(e instanceof Error ? e.message : "Lỗi R2");
          break;
        }
      }
    }
    setRunning(false);
    toast.success(`Xong ${okCount} căn.`);
  }

  const secs = stats.start ? (Date.now() - stats.start) / 1000 : 0;
  const eta = stats.done && running ? Math.round(((stats.files - stats.done) * secs) / stats.done / 60) : null;

  return (
    <div className="space-y-3 pb-24">
      <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-[14px] font-bold text-white", running && "pointer-events-none opacity-50")}>
            <FolderOpen className="h-4 w-4" /> Chọn thư mục ảnh
            <input
              type="file"
              multiple
              className="hidden"
              // @ts-expect-error — chọn cả thư mục (Chrome/Edge/Safari đều hỗ trợ)
              webkitdirectory=""
              onChange={(e) => onPick(e.target.files)}
            />
          </label>
          {(["villa", "all"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={cn("rounded-xl px-3 py-2 text-[12.5px] font-bold", scope === s ? "bg-ink text-white" : "border border-border text-ink-muted")}>
              {s === "villa" ? "Ghép với Villa" : "Ghép với mọi sản phẩm"}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          VD: <b>Ảnh villa/</b> → <b>SS Rose Garden/</b>1.jpg, 2.jpg… · <b>Đại Dương Villa 1/</b>… — tên thư mục con = mã căn (khuyên dùng) hoặc tên căn. Mỗi ảnh được nén thành ảnh xem ~1280px và ảnh nhỏ ~480px, up 4 ảnh cùng lúc. Up bằng máy tính, cắm sạc, để tab mở đến khi xong.
        </p>
        <div className="flex flex-wrap gap-4 text-[13px]">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} className="accent-teal" /> Thay toàn bộ ảnh cũ của căn
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} className="accent-teal" /> Thêm vào sau ảnh đang có
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={skipDone} onChange={(e) => setSkipDone(e.target.checked)} className="accent-teal" /> Bỏ qua thư mục đã up xong (chạy lại sau khi mất mạng)
          </label>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-paper-dim text-left text-[11px] uppercase text-ink-muted">
              <tr>
                <th className="px-3 py-2">Thư mục</th>
                <th>Ảnh</th>
                <th>Ghép với căn</th>
                <th>Đang có</th>
                <th className="pr-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => {
                const st = status[g.folder];
                const row = rows.find((r) => r.id === g.productId);
                const wasDone = g.productId && done[doneKey(g)];
                return (
                  <tr key={g.folder} className={cn("border-t border-border/60", !g.productId && "bg-amber-50/60")}>
                    <td className="px-3 py-1.5 font-semibold text-ink">{g.folder}</td>
                    <td>{g.files.length}</td>
                    <td className="py-1">
                      <select
                        value={g.productId}
                        disabled={running}
                        onChange={(e) => setGroups((gs) => gs.map((x, i) => (i === gi ? { ...x, productId: e.target.value, auto: false } : x)))}
                        className={cn("h-8 max-w-[300px] rounded-lg border px-2 text-[12.5px]", g.productId ? "border-border" : "border-amber-400 font-bold text-amber-800")}
                      >
                        <option value="">— Chưa ghép (bỏ qua) —</option>
                        {pool.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.code ? ` · ${r.code}` : ""} · {r.area}
                          </option>
                        ))}
                      </select>
                      {g.productId && g.auto && <span className="ml-1 text-[10.5px] text-ink-muted">tự ghép</span>}
                    </td>
                    <td className="text-ink-muted">{row ? `${row.images.length} ảnh` : "—"}</td>
                    <td className="pr-3">
                      {st?.kind === "work" && (
                        <span className="flex items-center gap-1 text-teal-dark">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {st.text}
                        </span>
                      )}
                      {st?.kind === "done" && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {st.text}
                        </span>
                      )}
                      {st?.kind === "error" && (
                        <span className="flex items-center gap-1 text-hot">
                          <XCircle className="h-3.5 w-3.5" /> {st.text}
                        </span>
                      )}
                      {!st && wasDone && skipDone && <span className="text-[12px] text-emerald-700">Đã up trước đó</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {groups.length > 0 && (
        <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-float backdrop-blur">
          {running ? (
            <button onClick={() => (cancel.current = true)} className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-[14px] font-bold text-ink">
              <Square className="h-4 w-4" /> Dừng
            </button>
          ) : (
            <button onClick={run} disabled={!todo.length} className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand px-5 text-[14px] font-bold text-white disabled:opacity-50">
              <Upload className="h-4 w-4" /> Up {todo.length} căn ({todo.reduce((a, g) => a + g.files.length, 0)} ảnh)
            </button>
          )}
          {stats.start > 0 && (
            <span className="text-[12.5px] font-semibold text-ink-muted">
              {stats.done}/{stats.files} ảnh · {(stats.bytes / 1048576).toFixed(0)} MB
              {eta != null ? ` · còn khoảng ${eta} phút` : ""}
            </span>
          )}
          {groups.some((g) => !g.productId) && (
            <span className="text-[12px] font-semibold text-amber-800">{groups.filter((g) => !g.productId).length} thư mục chưa ghép được — chọn căn ở cột “Ghép với căn” hoặc để bỏ qua.</span>
          )}
        </div>
      )}
    </div>
  );
}
