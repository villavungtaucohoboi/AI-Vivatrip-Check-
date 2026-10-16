"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .slice(0, 40) || "anh";
  return `${base}.${dot > 0 ? name.slice(dot + 1).toLowerCase() : "jpg"}`;
}

/**
 * Ảnh của resort / khách sạn — tải lên, xoá, đổi thứ tự, chọn ảnh bìa.
 * Lưu NGAY khi thao tác (không cần bấm "Lưu tất cả"). Ảnh tự nén trước khi tải.
 * Đây là ảnh Sale dùng cho nút "Gộp ảnh" / "Gửi ảnh Zalo" ở trang chi tiết.
 */
export function ResortImagesManager({ productId, initial }: { productId: string; initial: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  async function persist(next: string[], msg: string) {
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrls: next }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Không lưu được ảnh");
    setUrls(next);
    toast.success(msg);
  }

  async function upload(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < imgs.length; i++) {
        setBusy(`Đang tải ${i + 1}/${imgs.length}…`);
        const small = await compressImage(imgs[i]);
        const path = `${productId}/${Date.now()}-${i}-${safeName(small.name || imgs[i].name)}`;
        const { error } = await supabase.storage.from("product-images").upload(path, small, { upsert: true });
        if (error) throw new Error(`Lỗi tải ảnh: ${error.message}`);
        uploaded.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      }
      await persist([...urls, ...uploaded], `Đã thêm ${uploaded.length} ảnh.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được ảnh");
    } finally {
      setBusy(null);
    }
  }

  async function act(next: string[], msg: string) {
    setBusy("Đang lưu…");
    try {
      await persist(next, msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(null);
    }
  }

  // Ctrl+V ảnh khi đang trỏ chuột trong khung ảnh
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        upload(files);
      }
    };
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  });

  const move = (i: number, d: number) => {
    const next = [...urls];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    act(next, "Đã đổi thứ tự ảnh.");
  };

  return (
    <div ref={boxRef} tabIndex={0} className="space-y-2 rounded-xl outline-none focus:ring-2 focus:ring-teal/30">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-teal-dark">Ảnh gửi khách ({urls.length})</p>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-[12px] font-bold text-white",
            busy && "pointer-events-none opacity-60"
          )}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {busy ?? "Tải ảnh lên"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(Array.from(e.target.files ?? []))} />
        </label>
        <span className="text-[11px] text-ink-muted">Chọn nhiều ảnh 1 lần, hoặc bấm vào khung này rồi Ctrl+V. Ảnh đầu tiên = ảnh bìa.</span>
      </div>
      {urls.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {urls.map((u, i) => (
            <div key={`${u}-${i}`} className="group relative overflow-hidden rounded-lg border border-border bg-paper-dim">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-teal px-1.5 py-0.5 text-[9.5px] font-bold text-white">ẢNH BÌA</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" title="Sang trái" onClick={() => move(i, -1)} className="rounded p-1 text-white hover:bg-white/20">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    title="Đặt làm ảnh bìa"
                    onClick={() => act([u, ...urls.filter((x) => x !== u)], "Đã đặt ảnh bìa.")}
                    className="rounded p-1 text-white hover:bg-white/20"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Xoá ảnh"
                  onClick={() => act(urls.filter((x) => x !== u), "Đã xoá ảnh.")}
                  className="rounded p-1 text-white hover:bg-red-500/70"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Sang phải" onClick={() => move(i, 1)} className="rounded p-1 text-white hover:bg-white/20">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-ink-muted">
          Chưa có ảnh. Tải ảnh lên để Sale dùng nút “Gộp ảnh” / “Gửi ảnh Zalo” cho khách.
        </p>
      )}
    </div>
  );
}
