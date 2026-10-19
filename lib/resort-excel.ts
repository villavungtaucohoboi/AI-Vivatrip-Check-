import * as XLSX from "xlsx";
import type { ResortIn } from "@/lib/resort-save";

/**
 * FILE EXCEL BẢNG GIÁ CHUẨN VIVATRIP (3 sheet):
 *  1) "Khách sạn"   — mỗi dòng 1 khách sạn
 *  2) "Giai đoạn"   — mỗi dòng 1 khoảng ngày của 1 giai đoạn (1 giai đoạn nhiều khoảng = nhiều dòng cùng số GĐ)
 *  3) "Phòng & giá" — mỗi dòng 1 hạng phòng, giá theo cột GĐ1 thường / GĐ1 cuối tuần / GĐ2…
 * Cột được nhận theo TÊN tiêu đề (đổi thứ tự cột vẫn được).
 */

export const MAX_PERIODS = 20;
export const SHEETS = { hotel: "Khách sạn", period: "Giai đoạn", room: "Phòng & giá", guide: "Hướng dẫn" };
export const HOTEL_COLS = [
  "Mã KS *",
  "Tên khách sạn *",
  "Loại * (Resort / Khách sạn / Homestay)",
  "Hạng sao",
  "Khu vực *",
  "Địa chỉ",
  "Link album ảnh",
  "Giá mua của",
  "Đêm cuối tuần (VD: T6, T7)",
  "Hồ bơi",
  "Sát biển",
  "View biển",
  "View hồ",
  "Karaoke",
  "BBQ",
  "Pickleball",
  "Quyền lợi (gửi khách)",
  "Phụ thu",
  "Tóm tắt hợp đồng (chỉ Sale)",
  "Gộp đối tác (tên chung)",
  "Lưu ý (không nhập vào web)",
];
export const PERIOD_COLS = ["Mã KS *", "GĐ số *", "Tên giai đoạn *", "Từ ngày", "Đến ngày", "Theo lịch ngày lễ chung (x)"];
export const ROOM_COLS = [
  "Mã KS *",
  "Hạng phòng *",
  "Gói giá (Ăn sáng / 2 bữa / All Inclusive…)",
  "Diện tích m²",
  "Giường",
  "Người lớn",
  "Trẻ em",
  "Ăn sáng (x)",
  "Giá giường phụ",
  "Giảm giá %",
  ...Array.from({ length: MAX_PERIODS }, (_, i) => [`GĐ${i + 1} thường`, `GĐ${i + 1} cuối tuần`]).flat(),
];
const AMEN: [string, string][] = [
  ["Hồ bơi", "pool"],
  ["Sát biển", "near_beach"],
  ["View biển", "sea_view"],
  ["View hồ", "near_lake"],
  ["Karaoke", "karaoke"],
  ["BBQ", "bbq"],
  ["Pickleball", "pickleball"],
];

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const keyOf = (label: string) => norm(label.replace(/\*/g, "").replace(/\(.*\)/, ""));
const str = (v: unknown) => (v == null ? "" : String(v).trim());
const yes = (v: unknown) => {
  const s = norm(v);
  return !!s && !["0", "khong", "no", "false", "k"].includes(s);
};
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  const n = Number(String(v).replace(/[^\d.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Nhận ngày dạng ô Date của Excel, "dd/mm/yyyy" hoặc "yyyy-mm-dd". */
function toDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return iso(new Date(v.getTime() + 12 * 3600 * 1000)); // tránh lệch múi giờ
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}` : null;
  }
  const s = str(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
/** "T6, T7" → [5,6]; "CN" → [0]; trống → [] */
function parseWeekend(v: unknown): number[] {
  const s = str(v).toUpperCase();
  const out = new Set<number>();
  for (const m of s.matchAll(/T\s*([2-7])|CN|CHỦ NHẬT|CHU NHAT/g)) out.add(m[1] ? Number(m[1]) - 1 : 0);
  return [...out].sort();
}
function parseType(v: unknown): "resort" | "hotel" | "homestay" {
  const s = norm(v);
  if (s.includes("homestay")) return "homestay";
  if (s.includes("khachsan") || s.includes("hotel")) return "hotel";
  return "resort";
}

type Row = Record<string, unknown>;
/** Đọc 1 sheet thành mảng object theo tiêu đề chuẩn. */
function readSheet(wb: XLSX.WorkBook, want: string, cols: string[]): Row[] {
  const name = wb.SheetNames.find((n) => norm(n).includes(norm(want)));
  if (!name) return [];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" });
  const hi = grid.findIndex((r) => r.some((c) => norm(c).startsWith("maks")));
  if (hi < 0) return [];
  const header = grid[hi].map((c) => norm(c));
  const idx = cols.map((c) => {
    const k = keyOf(c);
    return header.findIndex((h) => h === k || h.startsWith(k));
  });
  return grid
    .slice(hi + 1)
    .map((r) => Object.fromEntries(cols.map((c, i) => [c, idx[i] >= 0 ? r[idx[i]] : ""])))
    .filter((o) => str(o[cols[0]]));
}

/** File có đúng các sheet của mẫu bảng giá khách sạn? */
export function isResortWorkbook(buf: ArrayBuffer): boolean {
  const names = XLSX.read(buf, { type: "array", bookSheets: true }).SheetNames.map(norm);
  return names.some((n) => n.includes(norm(SHEETS.hotel))) && names.some((n) => n.includes(norm(SHEETS.room)));
}

export interface ParsedHotel {
  resort: ResortIn;
  note: string;
  warnings: string[];
  rooms: number;
  minPrice: number | null;
  validTo: string | null;
  expired: boolean;
}

export function parseResortWorkbook(buf: ArrayBuffer, today = iso(new Date())): { hotels: ParsedHotel[]; error?: string } {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const hotels = readSheet(wb, SHEETS.hotel, HOTEL_COLS);
  if (!hotels.length) {
    return { hotels: [], error: `Không thấy sheet "${SHEETS.hotel}" đúng mẫu (cần dòng tiêu đề có cột "Mã KS"). Bấm "Tải file mẫu" để xem cách điền.` };
  }
  const periods = readSheet(wb, SHEETS.period, PERIOD_COLS);
  const rooms = readSheet(wb, SHEETS.room, ROOM_COLS);
  const code = (o: Row) => str(o["Mã KS *"]).toUpperCase();

  const out: ParsedHotel[] = hotels.map((h, hi) => {
    const c = code(h);
    const warnings: string[] = [];

    // Giai đoạn
    const per = new Map<number, { key: string; name: string; ranges: { from: string; to: string }[]; holiday?: boolean }>();
    for (const p of periods.filter((p) => code(p) === c)) {
      const no = Number(str(p["GĐ số *"]).replace(/\D/g, ""));
      if (!no || no > MAX_PERIODS) {
        warnings.push(`Giai đoạn số "${str(p["GĐ số *"])}" không hợp lệ (1–${MAX_PERIODS}).`);
        continue;
      }
      const cur = per.get(no) ?? { key: `p${no}`, name: str(p["Tên giai đoạn *"]) || `Giai đoạn ${no}`, ranges: [] };
      const f = toDate(p["Từ ngày"]);
      const t = toDate(p["Đến ngày"]);
      if (f && t) cur.ranges.push(f <= t ? { from: f, to: t } : { from: t, to: f });
      else if (str(p["Từ ngày"]) || str(p["Đến ngày"])) warnings.push(`GĐ${no}: không đọc được ngày "${str(p["Từ ngày"])} – ${str(p["Đến ngày"])}".`);
      if (yes(p["Theo lịch ngày lễ chung (x)"])) cur.holiday = true;
      per.set(no, cur);
    }
    const plist = [...per.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);

    // Phòng
    const roomRows = rooms.filter((r) => code(r) === c);
    const rlist = roomRows
      .map((r) => {
        const pp: Record<string, { wd: number | null; we: number | null }> = {};
        for (let i = 1; i <= MAX_PERIODS; i++) {
          const wd = num(r[`GĐ${i} thường`]);
          const we = num(r[`GĐ${i} cuối tuần`]);
          if (wd == null && we == null) continue;
          if (!per.has(i)) warnings.push(`"${str(r["Hạng phòng *"])}" có giá GĐ${i} nhưng sheet Giai đoạn chưa khai GĐ${i}.`);
          pp[`p${i}`] = { wd: wd ?? we, we: wd != null ? we : null };
        }
        if (!Object.keys(pp).length) warnings.push(`Bỏ qua "${str(r["Hạng phòng *"])}" vì chưa có giá.`);
        return {
          room_type: str(r["Hạng phòng *"]),
          rate_plan: str(r["Gói giá (Ăn sáng / 2 bữa / All Inclusive…)"]) || null,
          area_m2: num(r["Diện tích m²"]),
          bed: str(r["Giường"]) || null,
          capacity: num(r["Người lớn"]),
          max_children: num(r["Trẻ em"]),
          breakfast: yes(r["Ăn sáng (x)"]),
          extra_bed_price: num(r["Giá giường phụ"]),
          discount_percent: num(r["Giảm giá %"]) ?? 0,
          period_prices: pp,
        };
      })
      .filter((r) => r.room_type && Object.keys(r.period_prices).length);

    // Không có giai đoạn nào mà có giá GĐ1 → tạo "Giá chung"
    if (!plist.length && rlist.length) plist.push({ key: "p1", name: "Giá chung", ranges: [] });
    if (!rlist.length) warnings.push("Chưa có hạng phòng nào có giá.");
    if (!str(h["Khu vực *"])) warnings.push("Thiếu khu vực.");

    const allTo = plist.flatMap((p) => p.ranges.map((r) => r.to)).sort();
    const validTo = allTo.length ? allTo[allTo.length - 1] : null;
    const expired = !!validTo && validTo < today;
    if (expired) warnings.unshift(`Bảng giá đã HẾT HẠN (đến ${validTo.split("-").reverse().join("/")}).`);
    const prices = rlist.flatMap((r) => Object.values(r.period_prices).flatMap((v) => [v.wd, v.we])).filter((x): x is number => x != null);

    return {
      resort: {
        clientKey: `x${hi}-${c}`,
        info: {
          product_code: c,
          product_name: str(h["Tên khách sạn *"]),
          type: parseType(h["Loại * (Resort / Khách sạn / Homestay)"]),
          area: str(h["Khu vực *"]),
          address: str(h["Địa chỉ"]) || null,
          star: num(h["Hạng sao"]),
          image_link: str(h["Link album ảnh"]) || null,
          price_source: str(h["Giá mua của"]) || null,
          // cùng 1 khách sạn ở nhiều đối tác ghi tên khác nhau → tên chung để web gộp & hiện bên rẻ nhất
          group_key: str(h["Gộp đối tác (tên chung)"]) || undefined,
          perks: str(h["Quyền lợi (gửi khách)"]) || null,
          amenities: Object.fromEntries(AMEN.map(([label, k]) => [k, yes(h[label])])),
        },
        periods: plist,
        weekend_nights: parseWeekend(h["Đêm cuối tuần (VD: T6, T7)"]),
        surcharge_note: str(h["Phụ thu"]) || null,
        contract_summary: str(h["Tóm tắt hợp đồng (chỉ Sale)"]) || null,
        rooms: rlist,
      },
      note: str(h["Lưu ý (không nhập vào web)"]),
      warnings,
      rooms: rlist.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      validTo,
      expired,
    };
  });
  return { hotels: out };
}

/** File mẫu trống (kèm 1 dòng ví dụ + hướng dẫn). */
export function downloadResortTemplate() {
  const wb = XLSX.utils.book_new();
  const hotel = XLSX.utils.aoa_to_sheet([
    HOTEL_COLS,
    ["SP-VIDU", "Khách sạn Ví Dụ Sapa", "Khách sạn", 4, "Sapa", "1 Hoàng Liên, Sapa", "", "Mustgo · 092 5959 777", "T6, T7", "x", "", "", "", "", "", "", "✅ Ăn sáng buffet", "🛏️ Giường phụ 800.000đ/đêm", "💼 Giá commit 2026\n↩️ Huỷ trước 7 ngày miễn phí", ""],
  ]);
  const period = XLSX.utils.aoa_to_sheet([
    PERIOD_COLS,
    ["SP-VIDU", 1, "Thấp điểm", "01/01/2026", "31/05/2026", ""],
    ["SP-VIDU", 1, "Thấp điểm", "01/09/2026", "31/12/2026", ""],
    ["SP-VIDU", 2, "Cao điểm hè", "01/06/2026", "31/08/2026", ""],
    ["SP-VIDU", 3, "Lễ Tết", "", "", "x"],
  ]);
  const room = XLSX.utils.aoa_to_sheet([
    ROOM_COLS,
    ["SP-VIDU", "Deluxe Double", "Ăn sáng", 28, "1 giường đôi", 2, 1, "x", 800000, "", 1500000, 1800000, 2000000, 2300000, 2600000, ""],
  ]);
  const guide = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN"],
    ["• Mỗi khách sạn 1 MÃ KS duy nhất. Nhập lại file có cùng mã → web CẬP NHẬT (thay toàn bộ hạng phòng), không tạo trùng."],
    ["• Giai đoạn: 1 giai đoạn có nhiều khoảng ngày thì ghi nhiều dòng cùng số GĐ. Giai đoạn số LỚN hơn được ưu tiên khi trùng ngày (VD Lễ đè Cao điểm)."],
    ["• Ngày không thuộc giai đoạn nào → dùng giá GĐ1. Cột 'Theo lịch ngày lễ chung' = x → áp vào các ngày lễ trong Lịch của web."],
    ["• Đêm cuối tuần: ghi các đêm tính giá cuối tuần, VD 'T6, T7' (đêm thứ 6 và thứ 7) hoặc 'T7'. Bỏ trống = không tách cuối tuần."],
    ["• Giá ghi số VNĐ đầy đủ. Cột 'cuối tuần' bỏ trống = dùng giá thường."],
    ["• Cột có (x): đánh x là Có, bỏ trống là Không."],
  ]);
  XLSX.utils.book_append_sheet(wb, hotel, SHEETS.hotel);
  XLSX.utils.book_append_sheet(wb, period, SHEETS.period);
  XLSX.utils.book_append_sheet(wb, room, SHEETS.room);
  XLSX.utils.book_append_sheet(wb, guide, SHEETS.guide);
  XLSX.writeFile(wb, "vivatrip-mau-bang-gia-khach-san.xlsx");
}
