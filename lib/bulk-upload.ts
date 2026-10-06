"use client";

import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
  return data as T;
}

export function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : "";

  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleanExt ? `${cleanBase || "file"}.${cleanExt}` : cleanBase || "file";
}

/** Nén ảnh rồi tải lên Storage (cùng bucket + cách đặt tên với form thêm sản phẩm thường). */
export async function uploadProductImages(productId: string, files: File[]): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];
  for (const file of files) {
    const compressed = await compressImage(file);
    const path = `${productId}/${Date.now()}-${sanitizeFileName(compressed.name)}`;
    const { error } = await supabase.storage.from("product-images").upload(path, compressed, { upsert: true });
    if (error) throw new Error(`Lỗi upload ảnh: ${error.message}`);
    urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/** File bất kỳ (PDF, Word, ảnh...) — dùng cho file lịch trình du thuyền. Không nén, giữ nguyên bản gốc. */
export async function uploadRawFile(folder: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
  if (error) throw new Error(`Lỗi upload file: ${error.message}`);
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
