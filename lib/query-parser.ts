import { ProductType, SearchFilters } from "./types";

// Parser dựa trên keyword/regex — KHÔNG gọi AI, luôn chạy được kể cả
// khi chưa cấu hình bất kỳ AI API nào. Đây là bộ phân tích chính của app.
//
// Nếu về sau muốn nâng cấp bằng AI (ví dụ Claude API) để hiểu câu phức tạp
// hơn, hãy viết một hàm riêng (vd: lib/ai-parse.ts) trả về cùng kiểu
// SearchFilters, gọi nó trước, và luôn fallback về parseQuery() bên dưới
// nếu AI lỗi hoặc chưa có API key. Không sửa hàm này khi làm việc đó.

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .trim();
}

// Danh sách khu vực phổ biến — dùng làm gợi ý khi không truyền knownAreas.
// Trang search luôn nên truyền knownAreas lấy thực tế từ DB (distinct area)
// để parser nhận diện được cả những khu vực mới thêm sau này.
const DEFAULT_AREAS = [
  "Phan Thiết",
  "Mũi Né",
  "Vũng Tàu",
  "Hạ Long",
  "Nha Trang",
  "Phú Quốc",
  "Đà Lạt",
  "Đà Nẵng",
  "Hội An",
];

const TYPE_KEYWORDS: { keywords: string[]; type: ProductType }[] = [
  { keywords: ["villa", "biet thu"], type: "villa" },
  { keywords: ["resort"], type: "resort" },
  { keywords: ["khach san", "hotel"], type: "hotel" },
];

const AMENITY_KEYWORDS: Record<
  "pool" | "near_beach" | "sea_view" | "karaoke" | "bbq" | "pickleball" | "near_lake",
  string[]
> = {
  pool: ["ho boi", "be boi"],
  near_beach: ["sat bien", "bai bien", "di bo ra bien"],
  sea_view: ["view bien", "gan bien"],
  karaoke: ["karaoke"],
  bbq: ["bbq", "tiec nuong", "nuong"],
  pickleball: ["pickleball", "pickle ball"],
  near_lake: ["view ho", "gan ho", "sat ho", "canh ho"],
};

// Từ nối/chung chung hay gặp trong câu tìm kiếm — không có giá trị làm từ khoá tên sản phẩm
const STOPWORDS = new Set([
  "can", "tim", "co", "cho", "gia", "khoang", "tam", "toi", "da", "thieu", "duoi", "tren",
  "nguoi", "khach", "phong", "ngu", "dem", "tai", "o", "va", "voi", "mot", "cac", "san",
  "pham", "cua", "la", "nay", "do", "the", "day", "trong", "khong", "qua", "tu", "den",
  "hoac", "hay", "muon", "xin", "chi", "chinh",
]);

function parseMoney(numStr: string, unit: string): number {
  const num = parseFloat(numStr.replace(",", "."));
  const u = normalize(unit);
  if (u.startsWith("ty")) return Math.round(num * 1_000_000_000);
  if (u.startsWith("tr")) return Math.round(num * 1_000_000);
  if (u === "k" || u.startsWith("nghin") || u.startsWith("ngan")) {
    return Math.round(num * 1_000);
  }
  return Math.round(num);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// thu 2 = Thứ 2 (Monday, JS day 1) ... thu 7 = Thứ 7 (Saturday, JS day 6)
const WEEKDAY_NUMBER_TO_JS_DAY: Record<string, number> = {
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
};

/**
 * Trích ngày cụ thể từ câu tự nhiên: "ngày 15/08/2026", "hôm nay", "ngày mai",
 * "ngày kia", "thứ 7 tuần này", "chủ nhật tuần sau". Trả về YYYY-MM-DD hoặc
 * undefined nếu không tìm thấy. `now` cho phép test với thời điểm cố định.
 */
function parseDate(norm: string, now: Date): string | undefined {
  // dd/mm/yyyy hoặc dd-mm-yyyy hoặc dd/mm (năm hiện tại, hoặc năm sau nếu đã qua)
  const explicit = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = parseInt(explicit[2], 10);
    let year = explicit[3] ? parseInt(explicit[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let d = new Date(year, month - 1, day);
      if (!explicit[3] && d < startOfDay(now)) d = new Date(year + 1, month - 1, day);
      return toISO(d);
    }
  }

  if (/\bhom nay\b/.test(norm)) return toISO(now);
  if (/\bngay mai\b/.test(norm)) return toISO(addDays(now, 1));
  if (/\bngay kia\b/.test(norm)) return toISO(addDays(now, 2));

  // "thu 7 tuan nay", "chu nhat tuan sau", "thu 2"...
  const weekdayMatch = norm.match(/\bthu\s*([2-7])\b/);
  const isSunday = /\bchu nhat\b/.test(norm);
  if (weekdayMatch || isSunday) {
    const targetDay = isSunday ? 0 : WEEKDAY_NUMBER_TO_JS_DAY[weekdayMatch![1]];
    let d = nextOccurrenceOf(targetDay, now);
    if (/tuan sau/.test(norm)) d = addDays(d, 7);
    return toISO(d);
  }

  return undefined;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}
// Lần xuất hiện tiếp theo của thứ `targetDay` (0=CN..6=T7), tính cả hôm nay nếu trùng.
function nextOccurrenceOf(targetDay: number, now: Date): Date {
  const today = startOfDay(now);
  const diff = (targetDay - today.getDay() + 7) % 7;
  return addDays(today, diff);
}

export function parseQuery(
  rawQuery: string,
  knownAreas: string[] = DEFAULT_AREAS,
  now: Date = new Date()
): SearchFilters {
  const filters: SearchFilters = {};
  if (!rawQuery || !rawQuery.trim()) return filters;

  const norm = normalize(rawQuery);

  const date = parseDate(norm, now);
  if (date) filters.date = date;

  // --- Khu vực: so khớp theo tên khu vực có thật trong DB, chuỗi dài hơn ưu tiên trước
  const sortedAreas = [...knownAreas].sort((a, b) => b.length - a.length);
  for (const area of sortedAreas) {
    if (norm.includes(normalize(area))) {
      filters.area = area;
      break;
    }
  }

  // --- Loại sản phẩm
  for (const { keywords, type } of TYPE_KEYWORDS) {
    if (keywords.some((k) => norm.includes(k))) {
      filters.type = type;
      break;
    }
  }

  // --- Số khách: "15 người", "15 khách", "cho 15 ng"
  const guestsMatch = norm.match(/(\d+)\s*(nguoi|khach|ng\b)/);
  if (guestsMatch) {
    filters.guests = parseInt(guestsMatch[1], 10);
  }

  // --- Số phòng ngủ: "5 phòng ngủ", "5 pn"
  const bedroomsMatch = norm.match(/(\d+)\s*(phong ngu|pn\b)/);
  if (bedroomsMatch) {
    filters.bedrooms = parseInt(bedroomsMatch[1], 10);
  }

  // --- Ngân sách / giá: "khoảng 10 triệu", "dưới 15 triệu", "trên 5tr", "tầm 2 triệu"
  const moneyPattern = /(\d+[.,]?\d*)\s*(ty|tr\b|trieu|k\b|nghin|ngan)/g;
  let moneyMatch: RegExpExecArray | null;
  while ((moneyMatch = moneyPattern.exec(norm)) !== null) {
    const amount = parseMoney(moneyMatch[1], moneyMatch[2]);
    const context = norm.slice(Math.max(0, moneyMatch.index - 12), moneyMatch.index);

    if (/(duoi|toi da|khong qua|<=?)/.test(context)) {
      filters.priceTo = amount;
    } else if (/(tren|toi thieu|tu\s*$|>=?)/.test(context)) {
      filters.priceFrom = amount;
    } else {
      // "khoảng", "tầm", hoặc không có từ khoá rõ ràng -> coi là ngân sách mục tiêu
      filters.budget = amount;
    }
  }

  // --- Tiện ích
  if (AMENITY_KEYWORDS.pool.some((k) => norm.includes(k))) filters.pool = true;
  if (AMENITY_KEYWORDS.near_beach.some((k) => norm.includes(k))) filters.near_beach = true;
  if (AMENITY_KEYWORDS.sea_view.some((k) => norm.includes(k))) filters.sea_view = true;
  if (AMENITY_KEYWORDS.karaoke.some((k) => norm.includes(k))) filters.karaoke = true;
  if (AMENITY_KEYWORDS.bbq.some((k) => norm.includes(k))) filters.bbq = true;
  if (AMENITY_KEYWORDS.pickleball.some((k) => norm.includes(k))) filters.pickleball = true;
  if (AMENITY_KEYWORDS.near_lake.some((k) => norm.includes(k))) filters.near_lake = true;

  // --- Tên sản phẩm: phần còn lại sau khi đã "trừ" hết khu vực/loại/ngày/giá/
  // số khách/số phòng/tiện ích đã hiểu được. VD "Doris villa sóc sơn" sau khi
  // trừ "villa" (loại) và "sóc sơn" (khu vực) còn lại "doris" -> tìm theo tên.
  let remainder = norm;
  if (filters.area) remainder = remainder.replace(normalize(filters.area), " ");
  for (const { keywords, type } of TYPE_KEYWORDS) {
    if (filters.type === type) keywords.forEach((k) => (remainder = remainder.replace(k, " ")));
  }
  remainder = remainder
    .replace(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g, " ")
    .replace(/\bhom nay\b|\bngay mai\b|\bngay kia\b|\bthu\s*[2-7]\b|\bchu nhat\b|\btuan sau\b|\btuan nay\b/g, " ")
    .replace(/(\d+[.,]?\d*)\s*(ty|tr\b|trieu|k\b|nghin|ngan)/g, " ")
    .replace(/(\d+)\s*(nguoi|khach|ng\b)/g, " ")
    .replace(/(\d+)\s*(phong ngu|pn\b)/g, " ");
  Object.values(AMENITY_KEYWORDS)
    .flat()
    .forEach((k) => (remainder = remainder.replace(k, " ")));

  const nameWords = remainder
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  if (nameWords.length > 0) {
    filters.name = nameWords.join(" ");
  }

  return filters;
}
