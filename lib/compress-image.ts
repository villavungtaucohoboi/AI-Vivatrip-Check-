"use client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Nén + resize 1 ảnh ngay trên trình duyệt trước khi tải lên Supabase Storage.
 * Ảnh chụp điện thoại gốc thường 3-8MB — sau bước này thường còn vài trăm KB,
 * giúp cả upload lẫn các lần tải trang sau nhanh hơn nhiều. Nếu vì lý do gì
 * đó nén lỗi (định dạng lạ...), trả về file gốc để không chặn việc đăng bài.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // không nhỏ hơn thì thôi dùng bản gốc

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
