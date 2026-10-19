import * as XLSX from "xlsx";
import { norm } from "@/lib/tour-utils";
import type { Tour, TourDeparture } from "@/lib/tour-types";

/**
 * ĐỌC FILE EXCEL "LỊCH KHỞI HÀNH / SỐ CHỖ" CỦA ĐỐI TÁC (nhiều tab, ô gộp).
 * Tự tìm dòng tiêu đề có "Ngày đi" + "Giá", nhận cột theo tên:
 *   Chương trình · Độ dài · Hàng không · Ngày đi · Giá bán (có giá gạch) · Com · Tổng chỗ · Đã bán · Còn nhận
 * Ô gộp (tên chương trình, hãng bay…) được trải xuống các dòng bên dưới.
 */

export interface ExcelProgram {
  key: string;
  sheet: string;
  name: string;
  detail: string;
  duration: string;
  days: number | null;
  airline: string;
  rows: TourDeparture[];
}

type Col = "program" | "duration" | "airline" | "date" | "price" | "com" | "seats" | "sold" | "remain" | "child" | "infant";
const HEAD: [Col, RegExp][] = [
  ["date", /^(ngay di|ngay khoi hanh|khoi hanh|ngay kh|ngay)\b/],
  ["price", /^(gia ban|gia tour|gia nguoi lon|gia nl|gia)\b/],
  ["com", /^(com|hoa hong|chiet khau|ck)\b/],
  ["seats", /^(tong so cho|tong cho|tong|so cho)\b/],
  ["sold", /^(da ban|da dat|da giu)\b/],
  ["remain", /^(con nhan|con lai|con cho|con)\b/],
  ["child", /^(tre em|gia te|te)\b/],
  ["infant", /^(em be|gia eb|eb)\b/],
  ["program", /^(chuong trinh|hanh trinh|ten tour|tour)\b/],
  ["duration", /^(do dai|so ngay|thoi gian|thoi luong)/],
  ["airline", /^(hang khong|hang bay|hhk|bay)\b/],
];
const clean = (v: unknown) => norm(String(v ?? "")).replace(/\s+/g, " ").trim();

function grid(ws: XLSX.WorkSheet): unknown[][] {
  const g = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
  for (const m of ws["!merges"] ?? []) {
    const v = g[m.s.r]?.[m.s.c];
    for (let r = m.s.r; r <= m.e.r; r++) {
      g[r] ??= [];
      for (let c = m.s.c; c <= m.e.c; c++) if (r !== m.s.r || c !== m.s.c) g[r][c] = v;
    }
  }
  return g;
}

/** Các số tiền trong 1 ô: "13.990.000\n12.990.000" → [13990000, 12990000] */
function money(v: unknown): number[] {
  if (typeof v === "number") return v > 0 ? [Math.round(v)] : [];
  const s = String(v ?? "");
  const out: number[] = [];
  for (const m of s.matchAll(/\d{1,3}(?:[.,]\d{3})+|\d{5,}/g)) out.push(Number(m[0].replace(/[.,]/g, "")));
  // "12tr990" / "12.99tr"
  if (!out.length) {
    const t = s.match(/(\d+(?:[.,]\d+)?)\s*(tr|trieu)\s*(\d{0,3})/i);
    if (t) out.push(Math.round(Number(t[1].replace(",", ".")) * 1e6 + (t[3] ? Number(t[3].padEnd(3, "0")) * 1000 : 0)));
  }
  return out.filter((n) => n >= 1000);
}
const int = (v: unknown): number | null => {
  if (typeof v === "number") return Math.round(v);
  const m = String(v ?? "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
};
function tagOf(s: string): string | null {
  const m = s.match(/\(([^)]+)\)/);
  if (!m) return null;
  const n = norm(m[1]);
  if (/noel|giang sinh/.test(n)) return "Noel";
  if (/tet dl|tet duong/.test(n)) return "Tết DL";
  if (/tet/.test(n)) return "Tết";
  return m[1].trim().slice(0, 20);
}

export function parseTourWorkbook(buf: ArrayBuffer, today: string): { programs: ExcelProgram[]; sheets: { name: string; text: string; found: number }[] } {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const programs = new Map<string, ExcelProgram>();
  const sheets: { name: string; text: string; found: number }[] = [];
  const baseYear = Number(today.slice(0, 4));

  for (const name of wb.SheetNames) {
    const g = grid(wb.Sheets[name]);
    let cols: Partial<Record<Col, number>> | null = null;
    let found = 0;
    let lastY = baseYear;
    let lastM = Number(today.slice(5, 7));

    for (let r = 0; r < g.length; r++) {
      const row = g[r] ?? [];
      // Dòng tiêu đề (có thể lặp lại giữa sheet)
      const map: Partial<Record<Col, number>> = {};
      row.forEach((cell, c) => {
        const t = clean(cell);
        if (!t || t.length > 40) return;
        for (const [k, re] of HEAD) if (map[k] == null && re.test(t)) { map[k] = c; break; }
      });
      if (map.date != null && map.price != null) {
        cols = map;
        continue;
      }
      if (!cols || cols.date == null || cols.price == null) continue;

      // Ngày đi
      const raw = row[cols.date];
      let date: string | null = null;
      let tag: string | null = null;
      if (raw instanceof Date && !isNaN(raw.getTime())) {
        const d = new Date(raw.getTime() + 12 * 3600e3);
        date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } else if (typeof raw === "number" && raw > 30000 && raw < 80000) {
        const p = XLSX.SSF.parse_date_code(raw);
        if (p) date = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
      } else {
        const s = String(raw ?? "");
        tag = tagOf(s);
        const m = s.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?/);
        if (m) {
          const dd = Number(m[1]);
          const mm = Number(m[2]);
          let yy = m[3] ? Number(m[3].length === 2 ? "20" + m[3] : m[3]) : lastY;
          if (!m[3] && mm < lastM - 6) yy = lastY + 1; // qua năm mới
          if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) date = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        }
      }
      if (!date) continue;
      lastY = Number(date.slice(0, 4));
      lastM = Number(date.slice(5, 7));
      if (!tag && typeof raw === "string") tag = tagOf(raw);

      const prices = money(row[cols.price]);
      if (!prices.length) continue;
      const adult = prices[prices.length - 1];
      const old = prices.length > 1 && prices[0] > adult ? prices[0] : null;
      const seats = cols.seats != null ? int(row[cols.seats]) : null;
      let sold = cols.sold != null ? int(row[cols.sold]) : null;
      const remain = cols.remain != null ? int(row[cols.remain]) : null;
      if (sold == null && seats != null && remain != null) sold = seats - remain;
      const progCell = cols.program != null ? String(row[cols.program] ?? "") : "";
      const lines = progCell.split(/\n/).map((x) => x.trim()).filter(Boolean);
      const pname = (lines[0] ?? name).replace(/\(\s*ks\b.*$/i, "").replace(/\s+/g, " ").trim();
      const duration = cols.duration != null ? String(row[cols.duration] ?? "").trim() : "";
      const airline = cols.airline != null ? String(row[cols.airline] ?? "").replace(/\s+/g, " ").trim() : "";
      const key = `${name}|${norm(pname)}|${norm(duration)}`;
      const p =
        programs.get(key) ??
        ({ key, sheet: name, name: pname, detail: lines.slice(1).join(" ").slice(0, 300), duration, days: int(duration), airline, rows: [] } as ExcelProgram);
      p.rows.push({
        depart_date: date,
        adult,
        old_adult: old,
        child: cols.child != null ? money(row[cols.child]).pop() ?? null : null,
        infant: cols.infant != null ? money(row[cols.infant]).pop() ?? null : null,
        com: cols.com != null ? money(row[cols.com]).pop() ?? null : null,
        seats,
        sold: sold ?? (seats != null ? 0 : null),
        tag,
      });
      programs.set(key, p);
      found++;
    }
    // Chữ của sheet (gửi AI nếu không tự đọc được)
    const text = g
      .map((row, i) => {
        const cells = (row ?? []).map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? "").replace(/\s+/g, " ").trim()));
        return cells.some(Boolean) ? `R${i + 1}: ${cells.join(" | ")}` : "";
      })
      .filter(Boolean)
      .join("\n");
    sheets.push({ name, text, found });
  }
  return { programs: [...programs.values()], sheets };
}

/** Ghép chương trình trong file với tour đã có (ưu tiên cùng đối tác, trùng tên + số ngày). */
export function matchProgram(p: { name: string; days: number | null }, tours: Tour[], partner: string): { id: string; score: number } | null {
  const tok = (s: string) => new Set(norm(s).replace(/\(.*?\)/g, " ").split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
  const a = tok(p.name);
  let best: { id: string; score: number } | null = null;
  for (const t of tours) {
    const b = tok(`${t.name} ${t.route_text ?? ""} ${(t.places ?? []).join(" ")}`);
    let inter = 0;
    a.forEach((w) => b.has(w) && inter++);
    let score = a.size ? inter / a.size : 0;
    if (p.days && t.days && p.days === t.days) score += 0.15;
    if (partner && norm(t.partner ?? "") === norm(partner)) score += 0.2;
    if (norm(t.name).includes("kich cau") !== norm(p.name).includes("kich cau")) score -= 0.3;
    if (!best || score > best.score) best = { id: t.id, score };
  }
  return best && best.score >= 0.55 ? best : null;
}
