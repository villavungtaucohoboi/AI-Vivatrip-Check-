"use client";

/** Tải ảnh về dạng Blob (Supabase Storage cho phép đọc từ trình duyệt). */
async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Không tải được ảnh.");
  return res.blob();
}

async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

/** Ghép nhiều ảnh thành 1 ảnh lưới PNG (clipboard chỉ giữ được 1 ảnh). */
export async function buildCollage(urls: string[]): Promise<Blob> {
  const blobs = await Promise.all(urls.slice(0, 9).map(fetchBlob));
  const bitmaps = await Promise.all(blobs.map(toBitmap));
  const cols = bitmaps.length > 1 ? 2 : 1;
  const cw = 900;
  const ch = 600;
  const gap = 8;
  const rows = Math.ceil(bitmaps.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * cw + (cols - 1) * gap;
  canvas.height = rows * ch + (rows - 1) * gap;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ ghép ảnh.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  bitmaps.forEach((bm, i) => {
    const x = (i % cols) * (cw + gap);
    const y = Math.floor(i / cols) * (ch + gap);
    const scale = Math.max(cw / bm.width, ch / bm.height);
    const w = bm.width * scale;
    const h = bm.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();
    ctx.drawImage(bm, x + (cw - w) / 2, y + (ch - h) / 2, w, h);
    ctx.restore();
  });
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh."))), "image/png"));
}

/** Copy 1 ảnh ghép vào clipboard — dán thẳng vào Zalo bằng Ctrl+V. */
export async function copyImagesCollage(urls: string[]): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("Trình duyệt này không cho copy ảnh. Hãy dùng Chrome hoặc Edge.");
  // Truyền Promise để giữ được thao tác bấm của người dùng trong lúc tải ảnh (Safari/Chrome đều chấp nhận).
  await navigator.clipboard.write([new ClipboardItem({ "image/png": buildCollage(urls) })]);
}

async function toFiles(urls: string[], baseName: string): Promise<File[]> {
  return Promise.all(
    urls.map(async (u, i) => {
      const b = await fetchBlob(u);
      const ext = b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg";
      return new File([b], `${baseName}-${i + 1}.${ext}`, { type: b.type || "image/jpeg" });
    })
  );
}

/** Điện thoại có hỗ trợ chia sẻ nhiều file ảnh (chọn Zalo gửi từng ảnh rời)? */
export function canShareImages(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([""], "a.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

export async function shareImages(urls: string[], title: string): Promise<void> {
  const files = await toFiles(urls, "anh");
  await navigator.share({ files, title });
}
