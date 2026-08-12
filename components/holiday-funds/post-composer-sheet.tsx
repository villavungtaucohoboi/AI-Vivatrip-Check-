"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getPosterToken, getSavedAuthorName, saveAuthorName } from "@/lib/holiday-fund-identity";
import { compressImage } from "@/lib/compress-image";
import type { HolidayFundPost } from "@/lib/holiday-fund-types";

function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : "";
  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleanExt ? `${cleanBase || "anh"}.${cleanExt}` : cleanBase || "anh";
}

export function PostComposerSheet({
  open,
  onOpenChange,
  sheetId,
  editingPost,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  editingPost?: HolidayFundPost | null;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const isEdit = !!editingPost;

  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAuthorName(editingPost?.author_name ?? getSavedAuthorName());
    setText(editingPost?.raw_content ?? "");
    setExistingImageUrls((editingPost?.holiday_fund_images ?? []).map((i) => i.image_url));
    setNewFiles([]);
  }, [open, editingPost]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!authorName.trim()) {
      toast.error("Vui lòng nhập tên của bạn.");
      return;
    }
    if (!text.trim()) {
      toast.error("Vui lòng dán nội dung quỹ.");
      return;
    }

    setSaving(true);
    saveAuthorName(authorName);

    try {
      const uploadedUrls: string[] = [...existingImageUrls];
      for (const file of newFiles) {
        const compressed = await compressImage(file);
        const path = `${sheetId}/${Date.now()}-${sanitizeFileName(compressed.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("holiday-fund-images")
          .upload(path, compressed, { upsert: true });
        if (uploadError) throw new Error(`Lỗi upload ảnh: ${uploadError.message}`);
        const { data } = supabase.storage.from("holiday-fund-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      const posterToken = getPosterToken();

      if (isEdit && editingPost) {
        const res = await fetch(`/api/holiday-funds/posts/${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            raw_content: text,
            poster_token: posterToken,
            image_urls: uploadedUrls,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
        toast.success("Đã cập nhật bài đăng");
      } else {
        const res = await fetch("/api/holiday-funds/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet_id: sheetId,
            author_name: authorName,
            poster_token: posterToken,
            raw_content: text,
            image_urls: uploadedUrls,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
        toast.success("Đã đăng quỹ");
      }

      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Sửa bài đăng" : "Đăng quỹ"}
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Đăng quỹ"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="hf-author">Tên của bạn</Label>
          <Input
            id="hf-author"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="VD: Quân"
          />
        </div>

        <div>
          <Label htmlFor="hf-text">Nội dung quỹ</Label>
          <textarea
            id="hf-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Dán thông tin quỹ vào đây...\nVD:\nMộc villa sóc sơn 29/8 - 9tr\nVilla an viên đồng đò 1/9 - 10tr"}
            rows={7}
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Mỗi dòng 1 villa/khách sạn. Hệ thống tự tách tên, ngày, giá — dòng không nhận diện được vẫn giữ nguyên.
          </p>
        </div>

        <div>
          <Label>Ảnh (tùy chọn)</Label>
          <div className="grid grid-cols-4 gap-2">
            {existingImageUrls.map((url, i) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-paper-dim">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 rounded-full bg-ink/60 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {newFiles.map((file, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-paper-dim">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 rounded-full bg-ink/60 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-ink-muted hover:bg-paper-dim">
              <Upload className="h-4 w-4" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            </label>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
