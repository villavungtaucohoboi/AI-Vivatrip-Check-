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

/** Tải tất cả ảnh; ảnh nào lỗi thì bỏ qua (không để ô trắng). */
export async function loadBitmaps(urls: string[]): Promise<ImageBitmap[]> {
  const res = await Promise.allSettled(urls.map(async (u) => toBitmap(await fetchBlob(u))));
  return res.filter((r): r is PromiseFulfilledResult<ImageBitmap> => r.status === "fulfilled").map((r) => r.value);
}

function drawCover(ctx: CanvasRenderingContext2D, bm: ImageBitmap, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / bm.width, h / bm.height);
  const dw = bm.width * scale;
  const dh = bm.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(bm, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/**
 * Ghép TẤT CẢ ảnh thành 1 ảnh lưới. Số cột tự chọn theo số ảnh; hàng cuối
 * thiếu ảnh thì các ảnh còn lại dãn đều cho kín hàng → không còn ô trắng.
 */
export function collageCanvas(bitmaps: ImageBitmap[]): HTMLCanvasElement {
  const n = Math.min(bitmaps.length, 40);
  if (!n) throw new Error("Không tải được ảnh nào.");
  const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 12 ? 3 : 4;
  const W = 1800;
  const gap = 8;
  const cellW = (W - (cols - 1) * gap) / cols;
  const cellH = Math.round((cellW * 2) / 3);
  const rows = Math.ceil(n / cols);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = rows * cellH + (rows - 1) * gap;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ ghép ảnh.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows; r++) {
    const start = r * cols;
    const inRow = Math.min(cols, n - start);
    const w = (W - (inRow - 1) * gap) / inRow;
    for (let c = 0; c < inRow; c++) drawCover(ctx, bitmaps[start + c], c * (w + gap), r * (cellH + gap), w, cellH);
  }
  return canvas;
}

const canvasBlob = (canvas: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh."))), type, q));

/** Ảnh gộp PNG (dùng để copy — clipboard chỉ nhận PNG). */
export async function buildCollage(urls: string[]): Promise<Blob> {
  return canvasBlob(collageCanvas(await loadBitmaps(urls)), "image/png");
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

export async function prepareImageFiles(urls: string[]): Promise<File[]> {
  return toFiles(urls, "anh");
}

export async function shareImages(urls: string[], title: string): Promise<void> {
  const files = await toFiles(urls, "anh");
  await navigator.share({ files, title });
}

/** Thu nhỏ + nén 1 ảnh thành JPEG (≤1600px) cho nhẹ khi gửi Zalo. */
async function bitmapToJpeg(bm: ImageBitmap, name: string, maxSide = 1600): Promise<File> {
  const s = Math.min(1, maxSide / Math.max(bm.width, bm.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bm.width * s);
  c.height = Math.round(bm.height * s);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  ctx.drawImage(bm, 0, 0, c.width, c.height);
  return new File([await canvasBlob(c, "image/jpeg", 0.85)], name, { type: "image/jpeg" });
}

export interface PhotoKit {
  /** Ảnh rời đã nén JPEG */
  files: File[];
  /** Ảnh gộp đủ tất cả ảnh: PNG để copy, JPEG để tải / chia sẻ */
  collagePng: Blob;
  collageJpg: File;
  /** Link xem trước ảnh gộp */
  previewUrl: string;
  /** Link xem trước từng ảnh rời (đúng thứ tự files) */
  thumbs: string[];
  failed: number;
}

/** Chuẩn bị SẴN mọi thứ trước khi bấm gửi (điện thoại chỉ mở bảng chia sẻ nếu không phải chờ). */
export async function preparePhotoKit(urls: string[], baseName: string): Promise<PhotoKit> {
  const bitmaps = await loadBitmaps(urls);
  if (!bitmaps.length) throw new Error("Không tải được ảnh nào.");
  const slug = baseName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "anh";
  const files = await Promise.all(bitmaps.map((bm, i) => bitmapToJpeg(bm, `${slug}-${String(i + 1).padStart(2, "0")}.jpg`)));
  const canvas = collageCanvas(bitmaps);
  const [collagePng, jpg] = await Promise.all([canvasBlob(canvas, "image/png"), canvasBlob(canvas, "image/jpeg", 0.88)]);
  return {
    files,
    collagePng,
    collageJpg: new File([jpg], `${slug}-anh-gop.jpg`, { type: "image/jpeg" }),
    previewUrl: URL.createObjectURL(jpg),
    thumbs: files.map((f) => URL.createObjectURL(f)),
    failed: urls.length - bitmaps.length,
  };
}

/** Chrome giới hạn tối đa 10 file / 1 lần chia sẻ → chia thành từng đợt. */
export const SHARE_BATCH = 10;
export function chunkFiles(files: File[], size = SHARE_BATCH): File[][] {
  const out: File[][] = [];
  for (let i = 0; i < files.length; i += size) out.push(files.slice(i, i + size));
  return out;
}

/** Điện thoại / máy tính bảng (màn cảm ứng) có bảng chia sẻ file. Máy tính thì dùng copy / tải về. */
export function isMobileShare(): boolean {
  if (!canShareImages()) return false;
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Copy 1 ảnh (bất kỳ định dạng) vào clipboard dưới dạng PNG. */
export async function copyImageFile(file: Blob): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("Trình duyệt này không cho copy ảnh. Hãy dùng Chrome hoặc Edge.");
  const png = (async () => {
    if (file.type === "image/png") return file;
    const bm = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = bm.width;
    c.height = bm.height;
    c.getContext("2d")!.drawImage(bm, 0, 0);
    return canvasBlob(c, "image/png");
  })();
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
