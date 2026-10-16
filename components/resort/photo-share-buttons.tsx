"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, ImageIcon, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildCollage, canShareImages, prepareImageFiles } from "@/lib/cruise-images";
import { cn } from "@/lib/utils";

/**
 * 2 cách gửi ảnh resort cho khách:
 *  1) GỘP các ảnh thành 1 ảnh lưới → Copy (dán Zalo) hoặc tải về
 *  2) GỬI TẤT CẢ ảnh rời qua bảng chia sẻ của điện thoại (chọn Zalo)
 * Bước chuẩn bị ảnh mất vài giây nên làm trước, bấm lần 2 mới mở chia sẻ
 * (điện thoại chặn bảng chia sẻ nếu phải đợi lâu sau khi bấm).
 */
export function PhotoShareButtons({ images, name, className }: { images: string[]; name: string; className?: string }) {
  const [busy, setBusy] = useState<"collage" | "share" | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  const files = useRef<File[] | null>(null);
  const collage = useRef<Blob | null>(null);
  const [ready, setReady] = useState({ files: false, collage: false });

  useEffect(() => {
    setCanShare(canShareImages());
    setCanCopy(typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write);
  }, []);

  if (!images.length) return null;

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onCollage() {
    // Đã có ảnh gộp → copy ngay (còn trong lượt bấm)
    if (collage.current) {
      try {
        if (!canCopy) throw new Error();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": collage.current })]);
        toast.success("Đã copy ảnh gộp — mở Zalo dán vào (Ctrl+V / bấm giữ → Dán).");
      } catch {
        download(collage.current, `${name}-anh-gop.png`);
        toast.success("Đã tải ảnh gộp về máy — gửi qua Zalo nhé.");
      }
      return;
    }
    setBusy("collage");
    try {
      const blob = await buildCollage(images);
      collage.current = blob;
      setReady((r) => ({ ...r, collage: true }));
      try {
        if (!canCopy) throw new Error();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success(`Đã gộp ${Math.min(images.length, 9)} ảnh và copy — mở Zalo dán vào.`);
      } catch {
        toast.success("Ảnh gộp đã sẵn sàng — bấm lần nữa để copy / tải về.");
      }
    } catch {
      toast.error("Không gộp được ảnh. Thử lại nhé.");
    } finally {
      setBusy(null);
    }
  }

  async function onShareAll() {
    if (files.current) {
      try {
        await navigator.share({ files: files.current, title: name });
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) toast.error("Máy không mở được bảng chia sẻ.");
      }
      return;
    }
    setBusy("share");
    try {
      files.current = await prepareImageFiles(images);
      setReady((r) => ({ ...r, files: true }));
      try {
        await navigator.share({ files: files.current, title: name });
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) toast.success("Ảnh đã sẵn sàng — bấm lần nữa để gửi Zalo.");
      }
    } catch {
      toast.error("Không tải được ảnh. Thử lại nhé.");
    } finally {
      setBusy(null);
    }
  }

  async function onDownloadAll() {
    setBusy("share");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const fs = files.current ?? (await prepareImageFiles(images));
      files.current = fs;
      fs.forEach((f) => zip.file(f.name, f));
      download(await zip.generateAsync({ type: "blob" }), `${name}-anh.zip`);
      toast.success(`Đã tải ${fs.length} ảnh về máy.`);
    } catch {
      toast.error("Không tải được ảnh.");
    } finally {
      setBusy(null);
    }
  }

  const btn = "flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[12.5px] font-bold disabled:opacity-60";
  return (
    <div className={cn("flex gap-2", className)}>
      <button type="button" disabled={busy !== null} onClick={onCollage} className={cn(btn, "border border-border bg-white text-ink")}>
        {busy === "collage" ? <Loader2 className="h-4 w-4 animate-spin" /> : ready.collage ? <Copy className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        {ready.collage ? "Copy ảnh gộp" : `Gộp ${Math.min(images.length, 9)} ảnh`}
      </button>
      {canShare ? (
        <button type="button" disabled={busy !== null} onClick={onShareAll} className={cn(btn, "bg-gradient-to-r from-teal to-sand text-white")}>
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {ready.files ? "Gửi Zalo ngay" : `Gửi ${images.length} ảnh Zalo`}
        </button>
      ) : (
        <button type="button" disabled={busy !== null} onClick={onDownloadAll} className={cn(btn, "border border-border bg-white text-ink")}>
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Tải {images.length} ảnh
        </button>
      )}
    </div>
  );
}
