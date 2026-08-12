"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "san-pham";
}

export function DownloadImagesButton({
  images,
  productName,
}: {
  images: { image_url: string }[];
  productName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (images.length === 0) return;
    setLoading(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let ok = 0;

      await Promise.all(
        images.map(async (img, i) => {
          try {
            const res = await fetch(img.image_url);
            if (!res.ok) throw new Error("fetch failed");
            const blob = await res.blob();
            const extMatch = img.image_url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
            const ext = extMatch ? extMatch[1] : "jpg";
            zip.file(`anh-${String(i + 1).padStart(2, "0")}.${ext}`, blob);
            ok++;
          } catch {
            // bỏ qua ảnh lỗi, vẫn tiếp tục tải các ảnh còn lại
          }
        })
      );

      if (ok === 0) {
        toast.error("Không tải được ảnh nào. Vui lòng thử lại.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(productName)}-anh.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(
        ok === images.length ? "Đã tải toàn bộ ảnh" : `Đã tải ${ok}/${images.length} ảnh (một số ảnh lỗi)`
      );
    } catch {
      toast.error("Có lỗi khi tải ảnh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading || images.length === 0}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Tải toàn bộ ảnh
    </Button>
  );
}
