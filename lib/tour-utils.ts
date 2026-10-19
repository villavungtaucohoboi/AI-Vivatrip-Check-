import type { Tour, TourDay, TourDeparture, TourWithDeps } from "@/lib/tour-types";

// Hàm dùng chung (chạy được cả server & trình duyệt) cho TOUR NƯỚC NGOÀI.

export const HOTLINE = "VivaTrip · Hotline 0942.988.699";
export const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
export const kk = (n: number | null | undefined) => (n == null ? "—" : `${fmt(Math.round(n / 1000))}k`);
export const dmy = (s: string) => s.split("-").reverse().join("/");
export const dm = (s: string) => dmy(s).slice(0, 5);
export const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const WDL = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
export const weekday = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
export const norm = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
export function todayVN(): string {
  // Giờ Việt Nam (UTC+7) — tránh lệch ngày khi server chạy UTC
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const FLAGS: [RegExp, string][] = [
  [/han quoc|korea|seoul|busan/, "🇰🇷"],
  [/nhat|japan|tokyo|osaka/, "🇯🇵"],
  [/trung quoc|china|bac kinh|thuong hai|quang chau|thanh do|que lam|tay an|cap nhi tan|hai nam|phuong hoang/, "🇨🇳"],
  [/dai loan|taiwan/, "🇹🇼"],
  [/hong kong|hongkong/, "🇭🇰"],
  [/thai|bangkok|phuket|pattaya/, "🇹🇭"],
  [/singapore/, "🇸🇬"],
  [/malaysia|kuala/, "🇲🇾"],
  [/bali|indonesia/, "🇮🇩"],
  [/phap|chau au|y |duc|thuy si|europe/, "🇪🇺"],
  [/dubai|uae/, "🇦🇪"],
  [/uc|australia|sydney/, "🇦🇺"],
  [/my|hoa ky|usa/, "🇺🇸"],
];
export function flagOf(t: Pick<Tour, "country">): string {
  const c = norm(t.country);
  if (c.includes("+") || /han.*nhat|nhat.*han/.test(c)) return FLAGS.filter(([re]) => re.test(c)).map(([, f]) => f).slice(0, 2).join("") || "🌏";
  return FLAGS.find(([re]) => re.test(c))?.[1] ?? "🌏";
}

/** Khoá tuyến để gộp nhiều đối tác cùng chương trình. */
export function routeKeyOf(t: Pick<Tour, "route_key" | "name" | "days">): string {
  if (t.route_key?.trim()) return norm(t.route_key).replace(/[^a-z0-9]+/g, "");
  // Cùng tên + cùng số ngày = cùng tuyến (bản "Kích cầu"… có tên khác → tách riêng)
  return `${norm(t.name).replace(/[^a-z0-9]+/g, "")}-${t.days ?? ""}`;
}

export const left = (d: TourDeparture) => (d.seats != null ? d.seats - (d.sold ?? 0) : null);
export const isFull = (d: TourDeparture) => {
  const l = left(d);
  return l != null && l <= 0;
};
/** Ngày khởi hành còn hiệu lực (sau hôm nay) — ngày đã qua tự ẩn. */
export const upcoming = (deps: TourDeparture[], today: string) =>
  deps.filter((d) => d.depart_date > today).sort((a, b) => a.depart_date.localeCompare(b.depart_date));
export function minFrom(deps: TourDeparture[], today: string, month = ""): number | null {
  const l = upcoming(deps, today).filter((d) => !isFull(d) && (!month || d.depart_date.slice(0, 7) === month));
  return l.length ? Math.min(...l.map((d) => d.adult)) : null;
}

// ---------- Tìm kiếm: nhiều điểm đến + nơi khởi hành ----------
export const FROM_CITIES: Record<string, string[]> = {
  "Hà Nội": ["ha noi", "hn", "hanoi"],
  "TP.HCM": ["hcm", "tphcm", "sai gon", "saigon", "sg", "ho chi minh"],
  "Đà Nẵng": ["da nang", "danang", "dn"],
  "Hải Phòng": ["hai phong", "hp"],
  "Cần Thơ": ["can tho"],
};
export function canonicalCity(s: string): string {
  const n = norm(s).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  for (const [k, v] of Object.entries(FROM_CITIES)) if (v.includes(n) || norm(k).replace(/[^a-z ]/g, " ").trim() === n) return k;
  return s.trim();
}
export function parseTourQuery(q: string): { from: string; terms: string[] } {
  let s = norm(q);
  let from = "";
  const m = s.match(/\b(?:tu|khoi hanh|kh)\s+(ha noi|hn|hanoi|hcm|tphcm|sai gon|saigon|sg|ho chi minh|da nang|danang|dn|hai phong|can tho)\b/);
  if (m) {
    from = canonicalCity(m[1]);
    s = s.replace(m[0], " ");
  }
  const terms = s
    .split(/\s*(?:-|–|,|\+|\/|;|\bva\b|\bden\b)\s*/)
    .map((x) => x.replace(/\b(tour|di|du lich)\b/g, " ").replace(/\s+/g, " ").trim())
    .filter((x) => x.length >= 2);
  return { from, terms };
}
export function matchTour(t: Tour, terms: string[]) {
  const hay = norm(
    [t.name, t.route_text ?? "", t.country, ...(t.places ?? []), ...(t.highlights ?? []), ...(t.itinerary ?? []).flatMap((d) => [d.t, ...(d.items ?? [])])].join(" | ")
  );
  return terms.map((term) => ({ term, ok: hay.includes(term) }));
}
export const titleCase = (s: string) => s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

// ---------- Nội dung copy gửi khách (không có tên đối tác) ----------
const durationOf = (t: Tour) => (t.days ? `${t.days}N${t.nights ?? t.days - 1}Đ` : "");
export const tourHead = (t: Tour) =>
  `${flagOf(t)} ${t.name.toUpperCase()} ${durationOf(t)}`.trim() +
  (t.route_text ? `\n✈️ ${t.route_text}` : "") +
  `\n🛫 ${t.airline ? `Bay ${t.airline} · ` : ""}Khởi hành ${t.from_city}`;
export const dayText = (d: TourDay, i: number) =>
  `📍 NGÀY ${i + 1}: ${d.t.toUpperCase()}${d.meals ? ` (🍽 ${d.meals})` : ""}\n${(d.items ?? []).filter(Boolean).map((x) => "• " + x).join("\n")}${d.hotel ? `\n🏨 ${d.hotel}` : ""}`;

export interface QuoteInput {
  date: string;
  adult: number;
  child: number;
  infant: number;
  single: number;
  visa: number;
}
export function quoteCalc(t: TourWithDeps, q: QuoteInput) {
  const d = t.departures.find((x) => x.depart_date === q.date);
  if (!d) return null;
  const vd = (Number(t.visa_discount) || 0) * Math.min(q.visa, q.adult + q.child);
  const total = d.adult * q.adult + (d.child ?? 0) * q.child + (d.infant ?? 0) * q.infant - vd;
  return { d, vd, total, com: (d.com ?? 0) * (q.adult + q.child) };
}

export type CopyKind = "intro" | "highlights" | "quote" | "dates" | "itin" | "incl" | "excl" | "inclexcl" | "visa" | "all" | `day${number}`;
export const COPY_TITLE: Record<string, string> = {
  intro: "Tin chào tour",
  highlights: "Điểm nhấn",
  quote: "Báo giá theo ngày",
  dates: "Lịch khởi hành & giá",
  itin: "Lịch trình đầy đủ",
  incl: "Giá bao gồm",
  excl: "Không bao gồm",
  inclexcl: "Bao gồm + không bao gồm",
  visa: "Visa & lưu ý",
  all: "Toàn bộ tour",
};
export const copyTitle = (k: string) => (k.startsWith("day") ? `Ngày ${Number(k.slice(3)) + 1}` : COPY_TITLE[k] ?? k);

export function tourText(kind: string, t: TourWithDeps, today: string, q: QuoteInput): string {
  const ups = upcoming(t.departures, today).filter((d) => !isFull(d));
  const short = `${flagOf(t)} ${t.name.toUpperCase()} ${durationOf(t)}`.trim();
  const seatNote = (d: TourDeparture) => {
    const l = left(d);
    return l != null && l <= 5 ? ` (còn ${l})` : "";
  };
  switch (true) {
    case kind === "intro": {
      const from = minFrom(t.departures, today);
      return `${tourHead(t)}\n\n✨ ĐIỂM NHẤN\n${t.highlights.map((h) => "✅ " + h).join("\n")}\n\n${from ? `💰 Giá chỉ từ ${fmt(from)}đ/khách (trọn gói vé máy bay, khách sạn, ăn uống theo chương trình)\n` : ""}📅 Khởi hành: ${ups
        .slice(0, 8)
        .map((d) => dm(d.depart_date) + seatNote(d))
        .join(", ")}${ups.length > 8 ? "…" : ""}\n\n👉 Anh/chị muốn đi ngày nào để em giữ chỗ ạ?\n☎️ ${HOTLINE}`;
    }
    case kind === "highlights":
      return `${short}\n✨ ĐIỂM NHẤN\n${t.highlights.map((h) => "✅ " + h).join("\n")}\n☎️ ${HOTLINE}`;
    case kind === "quote": {
      const k = quoteCalc(t, q);
      if (!k) return "Chọn ngày khởi hành trước nhé.";
      const l = left(k.d);
      const L = [tourHead(t), "", `📅 Khởi hành: ${dmy(q.date)} (${WDL[weekday(q.date)]})${isFull(k.d) ? " – HẾT CHỖ" : l != null && l <= 5 ? ` – còn ${l} chỗ` : ""}`, "💰 BÁO GIÁ"];
      if (q.adult) L.push(`👨 ${q.adult} người lớn × ${fmt(k.d.adult)}đ${k.d.old_adult ? ` (giá gốc ${fmt(k.d.old_adult)}đ)` : ""} = ${fmt(k.d.adult * q.adult)}đ`);
      if (q.child) L.push(k.d.child != null ? `🧒 ${q.child} trẻ em × ${fmt(k.d.child)}đ = ${fmt(k.d.child * q.child)}đ` : `🧒 ${q.child} trẻ em: em báo giá sau ạ`);
      if (q.infant) L.push(k.d.infant != null ? `👶 ${q.infant} em bé × ${fmt(k.d.infant)}đ = ${fmt(k.d.infant * q.infant)}đ` : `👶 ${q.infant} em bé: em báo giá sau ạ`);
      if (k.vd) L.push(`🎟 ${q.visa} khách đã có visa: −${fmt(k.vd)}đ`);
      L.push(`➡️ TỔNG: ${fmt(k.total)}đ`);
      if (q.single && t.single_usd) L.push(`➕ Phụ thu phòng đơn: ${q.single} phòng × ${t.single_usd} USD/đêm × ${t.nights ?? ""} đêm`);
      if (t.includes.length) L.push("", `✔️ Đã gồm: ${t.includes.slice(0, 6).map((x) => x.split(/[,.(;]/)[0].trim()).join(", ")}`);
      if (t.excludes.length) L.push(`✖️ Chưa gồm: ${t.excludes.slice(0, 4).map((x) => x.split(/[(;]/)[0].trim()).join(", ")}`);
      L.push("", "Giá áp dụng tại thời điểm báo, giữ chỗ khi đặt cọc.", `☎️ ${HOTLINE}`);
      return L.join("\n");
    }
    case kind === "dates": {
      const by = new Map<string, TourDeparture[]>();
      for (const d of ups) {
        const key = `${d.adult}|${d.child}|${d.infant}|${d.tag ?? ""}`;
        by.set(key, [...(by.get(key) ?? []), d]);
      }
      return (
        `${short} – LỊCH KHỞI HÀNH & GIÁ\n\n` +
        [...by.values()]
          .sort((a, b) => a[0].adult - b[0].adult)
          .map(
            (l) =>
              `📅 ${l.map((d) => dm(d.depart_date) + seatNote(d)).join(", ")}${l[0].tag ? ` – ${l[0].tag}` : ""}\n   👨 NL ${fmt(l[0].adult)}đ${l[0].child != null ? ` · 🧒 TE ${fmt(l[0].child)}đ` : ""}${l[0].infant != null ? ` · 👶 EB ${fmt(l[0].infant)}đ` : ""}`
          )
          .join("\n") +
        `\n\n☎️ ${HOTLINE}`
      );
    }
    case kind === "itin":
      return `${tourHead(t)}\n\n${t.itinerary.map(dayText).join("\n\n")}\n\n☎️ ${HOTLINE}`;
    case kind.startsWith("day"): {
      const i = Number(kind.slice(3));
      return t.itinerary[i] ? `${short}\n\n${dayText(t.itinerary[i], i)}` : "";
    }
    case kind === "incl":
      return `✔️ GIÁ TOUR BAO GỒM\n${t.includes.map((x) => "• " + x).join("\n")}`;
    case kind === "excl":
      return `✖️ GIÁ TOUR KHÔNG BAO GỒM\n${t.excludes.map((x) => "• " + x).join("\n")}`;
    case kind === "inclexcl":
      return `${short}\n\n${tourText("incl", t, today, q)}\n\n${tourText("excl", t, today, q)}\n\n☎️ ${HOTLINE}`;
    case kind === "visa":
      return `📌 LƯU Ý VISA & XUẤT NHẬP CẢNH – ${t.country.toUpperCase()}\n${t.visa_notes.map((x) => "• " + x).join("\n")}\n\n☎️ ${HOTLINE}`;
    case kind === "all":
      return ["intro", "itin", "inclexcl", "visa"].map((k) => tourText(k, t, today, q)).join("\n\n━━━━━━━━━━\n\n");
  }
  return "";
}
