/**
 * TỰ KIỂM TRA BẢN RÚT GỌN so với BẢN GỐC (không cần AI, chạy ngay trên trình duyệt).
 * Bắt các lỗi hay gặp:
 *  - Tổng quan sai số (số phòng ngủ / số khách / tối đa / m2 không có trong bản gốc, tối đa < tiêu chuẩn…)
 *  - Con số lạ: giá, giờ, số khách xuất hiện trong bản rút gọn mà bản gốc không có (AI bịa / đọc nhầm)
 *  - Mất thông tin: giá tiền, giờ nhận–trả phòng, tiêu chuẩn / tối đa có trong bản gốc nhưng bị bỏ
 *  - Câu bị cắt "…", dòng trùng, xếp nhầm mục, chưa rút gọn / không đúng khung
 */

export type CheckLevel = "ok" | "warn" | "bad";
export interface NoteCheck {
  level: CheckLevel;
  issues: { level: "warn" | "bad"; text: string }[];
}

const plain = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

/** Giá trị tiền / số trong chữ: "12.000.000" → 12000000, "200k" → 200000, "1tr2" → 1200000, "1.200k" → 1200000. */
function moneyValues(t: string): Set<number> {
  const out = new Set<number>();
  const re = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|d|vnd)?(\d{1,3})?(?![a-z0-9])/g;
  for (const m of t.matchAll(re)) {
    const rawNum = m[1];
    const unit = m[2] ?? "";
    const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(rawNum);
    const n = grouped ? Number(rawNum.replace(/[.,]/g, "")) : Number(rawNum.replace(",", "."));
    if (!Number.isFinite(n)) continue;
    let v = n;
    if (unit === "tr" || unit === "trieu") v = n * 1e6 + (m[3] ? Number(m[3].padEnd(3, "0")) * 1000 : 0);
    else if (unit === "k" || unit === "nghin" || unit === "ngan") v = n * 1000;
    out.add(Math.round(v));
  }
  return out;
}
/** Các số tiền "đáng kể" (có đơn vị k/tr/đ hoặc ≥ 10.000) */
function prices(t: string): number[] {
  const out: number[] = [];
  for (const m of t.matchAll(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|d|vnd)(\d{1,3})?(?![a-z])/g)) {
    const v = [...moneyValues(m[0])][0];
    if (v && v >= 10000) out.push(v);
  }
  for (const m of t.matchAll(/(?<![\d.,])\d{1,3}(?:[.,]\d{3}){1,3}(?![\d.,])/g)) {
    const v = Number(m[0].replace(/[.,]/g, ""));
    if (v >= 10000) out.push(v);
  }
  return [...new Set(out)];
}
/** Giờ: "14h", "14h00", "14:00", "14 giờ" → 14 (chỉ lấy giờ nằm cạnh nhận/trả phòng, check in/out) */
function stayHours(t: string): number[] {
  const out = new Set<number>();
  for (const m of t.matchAll(/(check ?in|check ?out|nhan phong|tra phong)[^\d\n]{0,15}(\d{1,2})\s*(?:h|g|gio|:)/g)) out.add(Number(m[2]));
  for (const m of t.matchAll(/(\d{1,2})\s*(?:h|gio)\d{0,2}[^\d\n]{0,12}(check ?in|check ?out|nhan phong|tra phong)/g)) out.add(Number(m[1]));
  return [...out].filter((h) => h <= 24);
}
const fmtMoney = (v: number) => (v >= 1e6 ? `${(v / 1e6).toString().replace(".", ",")}tr` : `${Math.round(v / 1000)}k`);

/** Số X đứng ngay trước đơn vị ("10 người", "10NL", "5 PN") hoặc sau 1 cụm dẫn ("tiêu chuẩn: 10", "tối đa 20") */
function hasCount(src: string, n: number, units: string, lead = ""): boolean {
  if (new RegExp(`(?<!\\d)${n}\\s*(?:${units})(?![a-z])`).test(src)) return true;
  return !!lead && new RegExp(`(?:${lead})[\\s:là]{0,4}(?:khoang|tu|la)?\\s*${n}(?!\\d)`).test(src);
}
/** Tiện ích / thông tin hay bị AI bỏ sót */
const KEYS: [string, RegExp][] = [
  ["bể bơi", /be boi|ho boi/],
  ["karaoke", /karaoke/],
  ["bida", /bida|bi a|bi-a|billiard/],
  ["bi lắc", /bi lac/],
  ["BBQ", /bbq|nuong/],
  ["pickleball", /pickleball/],
  ["thuyền SUP / kayak", /\bsup\b|kayak/],
  ["xe đạp", /xe dap/],
  ["jacuzzi / xông hơi", /jacuzzi|xong hoi|bon suc/],
  ["phụ thu", /phu thu/],
  ["đặt cọc", /dat coc|\bcoc\b/],
  ["thú cưng", /thu cung|\bpet\b/],
  ["check in / out", /check ?in|check ?out|nhan phong|tra phong/],
  ["dọn dẹp", /don dep/],
];

export function checkNote(original: string, summary: string): NoteCheck {
  const issues: NoteCheck["issues"] = [];
  const bad = (text: string) => issues.push({ level: "bad", text });
  const warn = (text: string) => issues.push({ level: "warn", text });
  const src = plain(original);
  const sum = plain(summary);

  if (!summary.trim()) return { level: "bad", issues: [{ level: "bad", text: "Nội dung trống" }] };
  if (!/tong quan/.test(sum) && !/phong & khong gian|tien ich mien phi/.test(sum)) warn("Chưa theo khung chuẩn (chưa rút gọn?)");
  else if (summary.length >= original.length * 0.97 && original.length > 800) warn("Gần như không ngắn hơn bản gốc");

  // ---- 1) Dòng TỔNG QUAN
  const ovLine = sum.split("\n").find((l) => /phong ngu|khach|wc|m2/.test(l) && /·/.test(l)) ?? sum.split("\n").slice(0, 3).join(" ");
  const pn = ovLine.match(/(\d+)\s*phong ngu/);
  if (pn && !hasCount(src, Number(pn[1]), "pn|phong ngu|phong|ngu|bungalow|can|pr")) bad(`Tổng quan ghi ${pn[1]} phòng ngủ — bản gốc không thấy`);
  const wc = ovLine.match(/(\d+)\s*wc/);
  if (wc && !hasCount(src, Number(wc[1]), "wc|toilet|nha ve sinh|nvs|nha tam|phong tam|vs")) warn(`Tổng quan ghi ${wc[1]} WC — bản gốc không thấy`);
  const std = ovLine.match(/(\d+)\s*khach/);
  const max = ovLine.match(/toi da\s*(\d+)/);
  if (std) {
    const n = Number(std[1]);
    if (n > 80) bad(`Tổng quan ghi ${n} khách — quá vô lý`);
    else if (!hasCount(src, n, "khach|nguoi|ng|nl|pax|nguoi lon", "tieu chuan|toi thieu|suc chua|danh cho")) bad(`Tổng quan ghi ${n} khách — bản gốc không thấy`);
  }
  if (max) {
    const n = Number(max[1]);
    if (std && n < Number(std[1])) bad(`Tối đa ${n} khách nhỏ hơn tiêu chuẩn ${std[1]} khách`);
    if (!hasCount(src, n, "khach|nguoi|ng|nl|pax", "toi da|max|suc chua")) bad(`Tổng quan ghi tối đa ${n} khách — bản gốc không thấy`);
  }
  const m2 = ovLine.match(/~?\s*([\d.,]+)\s*m2/);
  if (m2 && !src.replace(/[.,]/g, "").includes(m2[1].replace(/[.,]/g, ""))) warn(`Diện tích ${m2[1]}m2 không thấy trong bản gốc`);

  // ---- 2) Con số lạ (giá) trong bản rút gọn
  const srcVals = moneyValues(src);
  const strange = prices(sum).filter((v) => !srcVals.has(v));
  if (strange.length) bad(`Giá không có trong bản gốc: ${strange.slice(0, 4).map(fmtMoney).join(", ")}`);
  const sh = stayHours(sum).filter((h) => !stayHours(src).includes(h) && !new RegExp(`(?<!\\d)${h}\\s*(h|g|gio|:)`).test(src));
  if (sh.length) bad(`Giờ nhận/trả phòng không khớp bản gốc: ${sh.map((h) => `${h}h`).join(", ")}`);

  // ---- 3) Mất thông tin quan trọng
  const sumVals = moneyValues(sum);
  const lost = prices(src).filter((v) => !sumVals.has(v));
  if (lost.length) (lost.length >= 3 ? bad : warn)(`Bị mất ${lost.length} mức giá: ${lost.slice(0, 5).map(fmtMoney).join(", ")}${lost.length > 5 ? "…" : ""}`);
  const lostH = stayHours(src).filter((h) => !new RegExp(`(?<!\\d)${h}\\s*(h|g|gio|:)`).test(sum));
  if (lostH.length) warn(`Bị mất giờ nhận/trả phòng: ${lostH.map((h) => `${h}h`).join(", ")}`);
  const srcMax = src.match(/toi da[^\d\n]{0,15}(\d+)/);
  if (srcMax && !new RegExp(`(?<!\\d)${srcMax[1]}(?!\\d)`).test(sum)) warn(`Bị mất "tối đa ${srcMax[1]}"`);

  const missing = KEYS.filter(([, re]) => re.test(src) && !re.test(sum)).map(([k]) => k);
  if (missing.length) (missing.length >= 3 ? bad : warn)(`Bị mất: ${missing.join(", ")}`);

  // ---- 4) Hình thức
  const cut = summary.split("\n").filter((l) => (l.match(/\(/g)?.length ?? 0) > (l.match(/\)/g)?.length ?? 0));
  if (cut.length) warn(`${cut.length} dòng bị cụt (mở ngoặc chưa đóng)`);
  if (/…|\.\.\.\s*$/m.test(summary)) warn("Có câu bị cắt dở (…)");
  const lines = summary.split("\n").map((l) => plain(l).replace(/[^a-z0-9]/g, "")).filter((l) => l.length > 8);
  const dup = lines.filter((l, i) => lines.indexOf(l) !== i);
  if (dup.length) warn(`${dup.length} dòng bị trùng`);
  // xếp nhầm mục
  const blocks = summary.split(/\n\s*\n/);
  for (const b of blocks) {
    const [head, ...body] = b.split("\n");
    const h = plain(head);
    const txt = plain(body.join("\n"));
    if (/nhan.{0,3}tra phong/.test(h) && body.some((l) => !/\d/.test(l))) warn("Mục NHẬN – TRẢ PHÒNG có dòng không phải giờ");
    if (/suc chua/.test(h) && /be boi|xe dap|nha tam|xich du|bida|karaoke/.test(txt)) warn("Mục SỨC CHỨA có lẫn tiện ích");
    if (/tien ich mien phi/.test(h) && body.some((l) => /\d+\s*k\b|\d+\s*(tr|trieu)\b|\d{1,3}[.,]\d{3}/.test(plain(l)) && !/free|mien phi/.test(plain(l))))
      warn("Mục TIỆN ÍCH MIỄN PHÍ có dòng ghi giá tiền");
  }

  const level: CheckLevel = issues.some((i) => i.level === "bad") ? "bad" : issues.length ? "warn" : "ok";
  return { level, issues };
}
