"use client";

import { useEffect, useState } from "react";
import { Copy, Download, FileText, ImageIcon, Loader2, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import {
  chunkFiles,
  copyImageFile,
  downloadBlob,
  isMobileShare,
  preparePhotoKit,
  type PhotoKit,
} from "@/lib/cruise-images";
import { cn } from "@/lib/utils";

// Ảnh đã chuẩn bị được nhớ lại theo resort → mở lại khung là dùng được ngay.
const kitCache = new Map<string, Promise<PhotoKit>>();
function getKit(images: string[], name: string) {
  const key = images.join("|");
  let p = kitCache.get(key);
  if (!p) {
    p = preparePhotoKit(images, name);
    p.catch(() => kitCache.delete(key));
    kitCache.set(key, p);
  }
  return p;
}

/** Nút mở khung "Gửi ảnh cho khách". */
export function PhotoShareButtons({
  images,
  name,
  description,
  className,
  compact,
}: {
  images: string[];
  name: string;
  /** Mô tả gửi kèm (không giá) — có thì hiện thêm nút Copy mô tả trong khung */
  description?: () => string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!images.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          getKit(images, name); // bắt đầu chuẩn bị ngay
          setOpen(true);
        }}
        className={cn(
          "flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-teal to-sand font-bold text-white",
          compact ? "h-8 px-2 text-[11.5px]" : "h-10 w-full text-[12.5px]",
          className
        )}
      >
        <ImageIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {compact ? `${images.length} ảnh` : `Gửi ${images.length} ảnh cho khách`}
      </button>
      {open && <PhotoShareDialog images={images} name={name} description={description} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhotoShareDialog({
  images,
  name,
  description,
  onClose,
}: {
  images: string[];
  name: string;
  description?: () => string;
  onClose: () => void;
}) {
  const [kit, setKit] = useState<PhotoKit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number[]>([]);

  useEffect(() => {
    setMobile(isMobileShare());
    let alive = true;
    getKit(images, name)
      .then((k) => alive && setKit(k))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "Không tải được ảnh."));
    return () => {
      alive = false;
    };
  }, [images, name]);

  // File đã sẵn → gọi share NGAY trong lượt bấm (điện thoại mới cho mở bảng chia sẻ)
  async function share(files: File[], idx?: number) {
    try {
      if (navigator.canShare && !navigator.canShare({ files })) throw new Error("canShare");
      await navigator.share({ files, title: name });
      if (idx != null) setSent((s) => [...s, idx]);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      toast.error("Máy không mở được bảng chia sẻ — dùng “Lưu ảnh về máy” rồi gửi từ thư viện ảnh nhé.");
    }
  }

  async function copyCollage() {
    if (!kit) return;
    try {
      await copyImageFile(kit.collagePng);
      toast.success(`Đã copy ảnh gộp (${kit.files.length} ảnh) — mở Zalo bấm Ctrl+V.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không copy được — dùng nút Tải ảnh gộp.");
    }
  }

  async function copyOne(i: number) {
    if (!kit) return;
    try {
      await copyImageFile(kit.files[i]);
      toast.success(`Đã copy ảnh ${i + 1} — dán vào Zalo (Ctrl+V).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không copy được ảnh.");
    }
  }

  async function zipAll() {
    if (!kit) return;
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      kit.files.forEach((f) => zip.file(f.name, f));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${kit.collageJpg.name.replace("-anh-gop.jpg", "")}-anh.zip`);
      toast.success(`Đã tải ${kit.files.length} ảnh (.zip) — giải nén, chọn hết rồi kéo thả vào Zalo.`);
    } catch {
      toast.error("Không tải được ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function copyDesc() {
    if (!description) return;
    await navigator.clipboard.writeText(description()).catch(() => null);
    toast.success("Đã copy mô tả — dán vào Zalo.");
  }

  const batches = kit ? chunkFiles(kit.files) : [];
  const btn = "flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold disabled:opacity-50";
  const primary = cn(btn, "bg-gradient-to-r from-teal to-sand text-white");
  const outline = cn(btn, "border border-border bg-white text-ink");

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Gửi ảnh cho khách"
      description={name}
      className="max-h-[92vh] max-w-lg overflow-y-auto p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="space-y-3">
        {!kit && !err && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-paper text-[13px] text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin text-teal" />
            Đang chuẩn bị {images.length} ảnh…
          </div>
        )}
        {err && <p className="rounded-xl bg-red-50 p-3 text-[13px] font-semibold text-hot">{err}</p>}

        {kit && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={kit.previewUrl} alt="Ảnh gộp" className="max-h-[38vh] w-full rounded-xl border border-border object-contain bg-paper" />
            <p className="text-center text-[12px] text-ink-muted">
              Ảnh gộp đủ <b className="text-ink">{kit.files.length} ảnh</b>
              {kit.failed > 0 && <span className="text-hot"> · {kit.failed} ảnh lỗi đã bỏ qua</span>}
            </p>

            {mobile ? (
              <div className="space-y-2">
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">Gửi ảnh rời qua Zalo</p>
                {batches.map((b, i) => {
                  const from = i * 10 + 1;
                  const to = from + b.length - 1;
                  return (
                    <button key={i} type="button" onClick={() => share(b, i)} className={sent.includes(i) ? outline : primary}>
                      <Send className="h-4 w-4" />
                      {batches.length > 1 ? (from === to ? `Gửi ảnh ${from}` : `Gửi ảnh ${from}–${to}`) : `Gửi ${b.length} ảnh`}
                      {sent.includes(i) ? " ✓" : ""}
                    </button>
                  );
                })}
                {batches.length > 1 && (
                  <p className="text-[11px] text-ink-muted">Điện thoại chỉ cho gửi tối đa 10 ảnh mỗi lần → gửi lần lượt từng nút.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => share([kit.collageJpg])} className={outline}>
                    <Share2 className="h-4 w-4" /> Gửi ảnh gộp
                  </button>
                  <button type="button" onClick={() => downloadBlob(kit.collageJpg, kit.collageJpg.name)} className={outline}>
                    <Download className="h-4 w-4" /> Lưu ảnh gộp
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button type="button" onClick={copyCollage} className={primary}>
                  <Copy className="h-4 w-4" /> Copy ảnh gộp ({kit.files.length} ảnh) → Ctrl+V vào Zalo
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={zipAll} disabled={busy} className={outline}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Tải {kit.files.length} ảnh rời
                  </button>
                  <button type="button" onClick={() => downloadBlob(kit.collageJpg, kit.collageJpg.name)} className={outline}>
                    <Download className="h-4 w-4" /> Tải ảnh gộp
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-ink-muted">
                  Máy tính chỉ copy được <b>1 ảnh mỗi lần</b>. Muốn gửi ảnh rời: bấm vào từng ảnh dưới đây để copy rồi Ctrl+V, hoặc
                  “Tải ảnh rời” → giải nén → chọn hết → kéo thả vào khung chat Zalo.
                </p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {kit.thumbs.map((u, i) => (
                    <button
                      key={`${u}-${i}`}
                      type="button"
                      title={`Copy ảnh ${i + 1}`}
                      onClick={() => copyOne(i)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">
                        Copy
                      </span>
                      <span className="absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {description && (
          <button type="button" onClick={copyDesc} className={outline}>
            <FileText className="h-4 w-4" /> Copy mô tả (không giá)
          </button>
        )}
      </div>
    </Dialog>
  );
}
