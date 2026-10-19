import { calculateDiscount, formatDiscount, getDiscountForTier, TIER_LABEL } from "@/lib/pricing";
import type { PriceTier, Product } from "@/lib/types";

const TIERS: PriceTier[] = ["weekday", "friday_sunday", "saturday_holiday"];
const BASE_FIELD = {
  weekday: "price_weekday",
  friday_sunday: "price_friday_sunday",
  saturday_holiday: "price_saturday_holiday",
} as const;

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

/** Giá 3 khung (gốc, CK, sau CK) — dùng chung cho trang chi tiết và nội dung gửi khách. */
export function villaTierPrices(product: Product) {
  return TIERS.map((tier) => {
    const base = product[BASE_FIELD[tier]] ?? null;
    const d = getDiscountForTier(product, tier);
    const hasDiscount = base != null && d.value > 0;
    const final = base != null && hasDiscount ? calculateDiscount(base, d.type, d.value).finalPrice : base;
    const discountShort = !hasDiscount
      ? ""
      : d.type === "amount"
      ? d.value >= 1_000_000
        ? `${(d.value / 1_000_000).toString().replace(".", ",")}tr`
        : `${Math.round(d.value / 1000)}k`
      : `${d.value}%`;
    return { tier, base, final, hasDiscount, discountLabel: hasDiscount ? formatDiscount(d.type, d.value) : "", discountShort };
  });
}

const AMENITY_TEXT: { key: keyof Product; label: string }[] = [
  { key: "pool", label: "Hồ bơi riêng" },
  { key: "near_beach", label: "Sát biển" },
  { key: "sea_view", label: "View biển" },
  { key: "near_lake", label: "View hồ" },
  { key: "karaoke", label: "Karaoke" },
  { key: "bbq", label: "BBQ" },
  { key: "pickleball", label: "Pickleball" },
];

/** Nội dung gọn gàng, có sticker, đồng nhất form để Sale copy dán Zalo gửi khách. */
export function villaQuoteText(product: Product): string {
  const lines: string[] = [];
  lines.push(`🏡 ${product.product_name.toUpperCase()}`);
  lines.push(`📍 ${product.address || (product.sub_region ? `${product.sub_region}, ${product.area}` : product.area)}`);
  const specs = [
    product.bedrooms != null ? `${product.bedrooms} phòng ngủ` : "",
    product.beds != null ? `${product.beds} giường` : "",
    product.standard_guests != null
      ? `${product.standard_guests} khách${product.max_guests ? ` (tối đa ${product.max_guests})` : ""}`
      : "",
  ].filter(Boolean);
  // Nội dung đã có mục "⭐ TỔNG QUAN" thì không lặp lại dòng thông số
  if (specs.length && !product.note?.includes("TỔNG QUAN")) lines.push(`🛏️ ${specs.join(" · ")}`);
  const am = AMENITY_TEXT.filter((a) => product[a.key]).map((a) => a.label);
  if (am.length) lines.push(`🌟 ${am.join(" · ")}`);

  lines.push("", "💰 GIÁ / ĐÊM");
  for (const r of villaTierPrices(product)) {
    if (r.final == null) continue;
    lines.push(
      `🔸 ${TIER_LABEL[r.tier]}: ${vnd(r.final)}${r.hasDiscount ? ` (giá gốc ${vnd(r.base!)} – giảm ${r.discountLabel}) 🔥` : ""}`
    );
  }
  if (product.extra_guest_fee) lines.push(`➕ Phụ thu khách thêm: ${vnd(product.extra_guest_fee)}/khách`);

  if (product.note?.trim()) lines.push("", product.note.trim());
  lines.push("", "☎️ VivaTrip · Hotline 0942.988.699", "💬 Inbox để giữ ngày đẹp nhé!");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// RÚT GỌN NỘI DUNG CĂN (bản miễn phí, không cần AI)
//
// Đầu ra luôn theo 1 khung cố định, thứ tự khách cần biết:
//   ⭐ TỔNG QUAN  (số phòng ngủ · WC · khách · diện tích — tự trích ra)
//   🛏️ PHÒNG & KHÔNG GIAN → 🎉 TIỆN ÍCH MIỄN PHÍ → 💳 DỊCH VỤ TÍNH PHÍ
//   👥 SỨC CHỨA & PHỤ THU → 📍 VỊ TRÍ & VIEW → ⏰ NHẬN – TRẢ PHÒNG → 📌 LƯU Ý
// - Đọc được chữ "kiểu" Facebook (𝐁𝐨𝐥𝐝, 𝑰𝒕𝒂𝒍𝒊𝒄) nhờ chuẩn hoá NFKC.
// - Tôn trọng tiêu đề mục có sẵn trong bài gốc ("Tiện ích miễn phí:",
//   "Dịch vụ tính phí:"...): các dòng bên dưới được xếp đúng mục đó.
// ---------------------------------------------------------------------------
export const NOTE_SECTIONS = [
  { key: "overview", title: "⭐ TỔNG QUAN" },
  { key: "space", title: "🛏️ PHÒNG & KHÔNG GIAN" },
  { key: "amenity", title: "🎉 TIỆN ÍCH MIỄN PHÍ" },
  { key: "paid", title: "💳 DỊCH VỤ TÍNH PHÍ" },
  { key: "capacity", title: "👥 SỨC CHỨA & PHỤ THU" },
  { key: "location", title: "📍 VỊ TRÍ & VIEW" },
  { key: "time", title: "⏰ NHẬN – TRẢ PHÒNG" },
  { key: "policy", title: "📌 LƯU Ý" },
] as const;
type SectionKey = (typeof NOTE_SECTIONS)[number]["key"];
const TITLE_TO_KEY = new Map<string, SectionKey>(
  NOTE_SECTIONS.map((x) => [plainVN(x.title).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim(), x.key])
);

function plainVN(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}
/** Tìm từ/cụm từ đứng riêng (không dính chữ cái hai bên) trong chuỗi đã bỏ dấu. */
const w = (src: string) => new RegExp(`(?<![a-z])(?:${src})(?![a-z])`);

const DROP = w(
  "chao quy khach|xin chao|kinh chao|hello|inbox|ib|lien he ngay|lh ngay|dat ngay|nhanh tay|so luong co han|hot hot|share|tha tim|follow|hotline|sdt|so dien thoai|fanpage|tran trong|xin cam on|cam on"
);
const URL_OR_PHONE = /(https?:\/\/|www\.|0\d{2,3}[.\s]?\d{3}[.\s]?\d{3,4})/;

/** Tiêu đề mục trong bài gốc → mục tương ứng của khung chuẩn. */
type Forced = SectionKey | "equip";
function headingSection(p: string): Forced | null {
  if (/tinh phi|co phi|dich vu|phat sinh/.test(p)) return "paid";
  if (/tien ich|mien phi|free/.test(p)) return "amenity";
  // "Trang thiết bị tại villa" → lẫn cả phòng ốc lẫn tiện ích → chia theo nội dung từng dòng
  if (/thiet bi|tien nghi|co so vat chat|trang bi/.test(p)) return "equip";
  if (/luu y|chinh sach|noi quy|quy dinh/.test(p)) return "policy";
  if (/vi tri|dia chi|view/.test(p)) return "location";
  if (/suc chua|tieu chuan|phu thu/.test(p)) return "capacity";
  if (/thong tin|chi tiet|khong gian|phong|ket cau|cau truc/.test(p)) return "space";
  return null;
}

/** Dòng có phải tiêu đề mục (VD "☀️ Tiện ích miễn phí :") không. */
function asHeading(clean: string): Forced | "unknown" | null {
  const m = clean.match(/^(.{2,40}?)\s*:\s*$/);
  if (!m) return null;
  return headingSection(plainVN(m[1])) ?? "unknown";
}

// Mục ƯU TIÊN theo nội dung (thắng cả tiêu đề gốc): sức chứa, giờ, cọc/huỷ...
// (chặt: phải có con số / cụm rõ nghĩa, tránh "check in" ảnh, "tiêu chuẩn khách sạn 5 sao", "áo phao trẻ em")
const PRIORITY: { section: SectionKey; re: RegExp }[] = [
  { section: "time", re: /(check ?in|check ?out|nhan phong|tra phong)[^\d]{0,12}\d{1,2}\s*(h|g|gio|:)|(\d{1,2}\s*(h|gio)\d{0,2})[^\d]{0,12}(check ?in|check ?out|nhan phong|tra phong)/ },
  { section: "capacity", re: /tieu chuan\s*:?\s*\d+\s*(nl|nguoi|khach|ng)(?![a-z])|toi da\s*:?\s*\d+|phu thu|(?<![a-z])suc chua|\d+\s*(nl|nguoi lon)(?![a-z])|tre (em )?(duoi|tu|tren)\s*\d+\s*tuoi/ },
  { section: "policy", re: w("dat coc|huy phong|hoan coc|thu cung|pet|khong duoc phep|nghiem cam|noi quy") },
  { section: "location", re: w("tap hoa|sieu thi|toa lac|cach trung tam|cach ha noi|cach ho|cach bien|\\d+ ?km") },
];
// Mục ĐOÁN theo nội dung (khi bài gốc không có tiêu đề mục)
const GUESS_PAID = /\d+\s*k(?![a-z])|\/ ?(gio|tui|nguoi|suat)|tinh phi|thuong luong|bao gia/;
const GUESS_SPACE = w("\\d+ ?pn|phong ngu|giuong|wc|toilet|nha tam|phong tam|nha ve sinh|bungalow|phong khach|phong bep|bep|sofa|sofabed|master");
const GUESS_AMENITY = w("be boi|ho boi|karaoke|loa|bbq|nuong|bida|bi a|bi-a|bi lac|pickleball|tennis|jacuzzi|xong hoi|san choi|cau truot|xich du|lua trai|sup|kayak|xe dap|be ca|ban ghe");
const GUESS_LOCATION = w("view|nhin ra|huong|doi|nui|ho|bien|rung|suoi|thuoc khu|nam trong");
const GUESS: { section: SectionKey; re: RegExp }[] = [
  { section: "paid", re: GUESS_PAID },
  { section: "space", re: GUESS_SPACE },
  { section: "amenity", re: GUESS_AMENITY },
  { section: "location", re: GUESS_LOCATION },
];

const ICONS: [RegExp, string][] = [
  [/(check ?in|check ?out|nhan phong|tra phong)[^\d]{0,12}\d{1,2}\s*(h|g|gio|:)|\d{1,2}\s*(h|gio)\d{0,2}[^\d]{0,12}(check ?in|check ?out|nhan phong|tra phong)/, "🕑"],
  [w("phu thu"), "💵"],
  [w("tieu chuan|toi da|nguoi lon|suc chua"), "👥"],
  [w("tre em|em be"), "👶"],
  [w("dat coc|huy phong|hoan coc"), "🧾"],
  [w("thu cung|pet"), "🐾"],
  [w("\\d+ ?pn|phong ngu|master"), "🛏️"],
  [w("bungalow"), "🛖"],
  [w("giuong|dem|topper|sofabed|nem"), "🛏️"],
  [w("wc|toilet|nha ve sinh|nha tam|phong tam|sua tam|dau goi|may say|bon tam"), "🚿"],
  [w("don dep|rua bat"), "🧹"],
  [w("bep nuong|bbq|nuong"), "🍖"],
  [w("phong bep|bep tu|bep ga|bep|tu lanh|noi xoong|xoong|bat dua"), "🍳"],
  [w("be boi|ho boi"), "🏊"],
  [w("karaoke|loa keo|loa"), "🎤"],
  [w("phong khach|sofa|tv|tivi|smarttv|smart tv"), "🛋️"],
  [w("bi lac"), "⚽"],
  [w("bida|bi a|bi-a"), "🎱"],
  [w("sup|kayak|thuyen"), "🚣"],
  [w("xe dap"), "🚲"],
  [w("xe dien"), "🛺"],
  [w("may phat dien|dien luoi|mat dien"), "⚡"],
  [w("be ca|ca koi|thac nuoc"), "🐟"],
  [w("xich du|cau truot|san choi"), "🛝"],
  [w("pickleball|tennis|cau long"), "🏓"],
  [w("jacuzzi|xong hoi|spa"), "🛁"],
  [w("than|da"), "🧊"],
  [w("them gio"), "⏱️"],
  [w("menu|nha hang|di cho|an uong|do an|khu vuc an|an ngoai troi"), "🍽️"],
  [w("tap hoa|sieu thi"), "🛒"],
  [w("nui|doi|ba vi|tam dao"), "⛰️"],
  [w("ho(?! tro)|bien|suoi"), "🌊"],
  [w("dien tich|m2"), "📐"],
  [w("cach|km|phut"), "📍"],
  [w("khach|nguoi|doan"), "👥"],
];
/** Emoji theo từ khoá XUẤT HIỆN SỚM NHẤT trong câu (chủ ngữ của câu), VD "Bể bơi … áo phao người lớn" → 🏊. */
function iconFor(p: string): string {
  let best: { at: number; icon: string } | null = null;
  for (const [re, icon] of ICONS) {
    const m = re.exec(p);
    if (m && (!best || m.index < best.at)) best = { at: m.index, icon };
  }
  return best?.icon ?? "▫️";
}

function cleanLine(l: string): string {
  return l
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/^[\s\-–—•*+>✓✔·.,;|]+/u, "")
    .replace(/\s+:\s*/g, ": ")
    .replace(/([!?.~])\1+/g, "$1")
    .replace(/,?\s*(vui long\s+)?(vui lòng\s+)?liên hệ( trực tiếp)?[^,.]*$/iu, "")
    .replace(/[\s,.;:]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Trích nhanh các con số khách hay hỏi nhất. */
function overviewLine(allPlain: string): string | null {
  const pn = allPlain.match(/(\d+)\s*(?:pn|phong ngu)(?![a-z])/);
  const wc = allPlain.match(/(\d+)\s*(?:wc|toilet|nha ve sinh)(?![a-z])/);
  // "tiêu chuẩn 10NL", "10 khách tiêu chuẩn" — KHÔNG lấy "tiêu chuẩn khách sạn 5 sao"
  const stdAfter = allPlain.match(/tieu chuan\s*:?\s*(\d+)\s*(?:nl|nguoi|khach|ng)(?![a-z])/);
  const std =
    allPlain.match(/(\d+)\s*(?:khach|nguoi lon|nguoi|nl)\s*tieu chuan/) ??
    (stdAfter ? [stdAfter[0], stdAfter[1]] : null) ??
    allPlain.match(/(\d+)\s*(?:nguoi lon|nl)(?![a-z])/);
  const max = allPlain.match(/toi da[^\d]{0,20}(\d+)/);
  const area = allPlain.match(/dien tich[^\d]{0,25}(\d[\d.,]*)\s*m2/);
  const parts = [
    pn ? `🛏️ ${pn[1]} phòng ngủ` : "",
    wc ? `🚿 ${wc[1]} WC` : "",
    std ? `👥 ${std[1]} khách${max ? ` (tối đa ${max[1]})` : ""}` : max ? `👥 Tối đa ${max[1]} khách` : "",
    area ? `📐 ~${area[1]}m2` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function summarizeNoteBasic(raw: string): string {
  // NFKC: 𝐌𝐨̣̂𝐭 → Một, 𝑻𝒊𝒆̣̂𝒏 → Tiện (chữ "kiểu" hay dùng trên Facebook)
  const text = raw.normalize("NFKC").replace(/\r/g, "");
  const buckets = new Map<SectionKey, string[]>();
  const seen = new Set<string>();
  let forced: Forced | null = null;
  let headline: string | null = null;

  for (const rawLine of text.split("\n")) {
    const cleanedWhole = cleanLine(rawLine);
    if (!cleanedWhole) continue;

    // Bỏ emoji/ký hiệu đầu dòng nhưng GIỮ dấu ":" cuối để nhận ra tiêu đề mục
    const headingProbe = rawLine
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2600}-\u{27BF}]/gu, " ")
      .replace(/^[\s\-–—•*+>·]+/u, "")
      .trim();
    const probePlain = plainVN(cleanedWhole).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    const known = TITLE_TO_KEY.get(probePlain);
    if (known) {
      forced = known;
      continue;
    }
    if (forced === "overview") continue; // dòng tổng quan sẽ được tạo lại
    const heading = asHeading(headingProbe);
    if (heading) {
      forced = heading === "unknown" ? null : heading;
      continue;
    }
    // "Tiêu chuẩn: 14 người lớn..." — phần trước dấu ":" là tiêu đề ngắn có nội dung phía sau
    const inline = cleanedWhole.match(/^(.{2,25}?):\s+(.+)$/);
    let lineForced: Forced | null = forced;
    let body = cleanedWhole;
    if (inline) {
      const hs = headingSection(plainVN(inline[1]));
      if (hs && hs !== "space" && hs !== "equip") lineForced = hs;
      // "Tiện ích miễn phí: bể bơi, karaoke" → bỏ chữ tiêu đề (đã có tiêu đề mục)
      if (hs === "amenity" || hs === "paid" || hs === "equip") body = inline[2];
    }
    // Dòng tiêu đề bài viết VIẾT HOA (VD "VILLA 5PN FREE BI A - KARAOKE…") → 1 dòng điểm nhấn ở Tổng quan
    const letters = cleanedWhole.replace(/[^\p{L}]/gu, "");
    const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
    if (!headline && !forced && letters.length >= 12 && upper >= letters.length * 0.85) {
      const t = cleanedWhole.toLowerCase().replace(/\s+([,.;])/g, "$1");
      headline = `✨ ${t.charAt(0).toUpperCase()}${t.slice(1)}`;
      seen.add(plainVN(cleanedWhole).replace(/[^a-z0-9]/g, ""));
      continue;
    }

    // tách câu: ". " + chữ hoa/số
    const sentences = body.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ỹ0-9])/u);
    for (const sRaw of sentences) {
      const sLine = cleanLine(sRaw);
      if (sLine.length < 3) continue;
      const p = plainVN(sLine);
      if (DROP.test(p) || URL_OR_PHONE.test(p)) continue;
      const key = p.replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) continue;

      let section: SectionKey | null = null;
      for (const r of PRIORITY) if (r.re.test(p)) { section = r.section; break; }
      if (!section && lineForced === "equip") section = GUESS_AMENITY.test(p) && !/\d+\s*(pn|phong ngu)/.test(p) ? "amenity" : "space";
      else if (!section && lineForced) section = lineForced as SectionKey;
      if (!section) for (const r of GUESS) if (r.re.test(p)) { section = r.section; break; }
      if (!section) continue; // câu văn tả cảm xúc, không có thông tin → bỏ cho gọn

      seen.add(key);
      // dòng quá dài → cắt ở dấu phẩy / ngoặc gần nhất (không cắt giữa chừng kiểu "…")
      let short = sLine;
      if (short.length > 140) {
        const cut = short.slice(0, 140);
        const paren = cut.lastIndexOf(" (");
        const at = paren > 60 ? paren : Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" - "));
        short = at > 60 ? short.slice(0, at).replace(/[\s,;(-]+$/, "") : short;
      }
      // ngoặc bị cắt dở (VD đã bỏ đoạn "liên hệ…") → đóng lại
      if ((short.match(/\(/g)?.length ?? 0) > (short.match(/\)/g)?.length ?? 0)) short = `${short.replace(/[\s,;]+$/, "")})`;
      const pretty = short.charAt(0).toUpperCase() + short.slice(1);
      buckets.set(section, [...(buckets.get(section) ?? []), `${iconFor(p)} ${pretty}`]);
    }
  }

  const ov = overviewLine(plainVN(text));
  if (ov || headline) buckets.set("overview", [ov, headline].filter((x): x is string => !!x));

  // Trong mục phòng: dòng có số phòng ngủ lên đầu
  const space = buckets.get("space");
  if (space) {
    const rank = (l: string) => (/\d+\s*(PN|pn|phòng ngủ)/.test(l) ? 0 : /bungalow|giường|đệm|sofabed/i.test(l) ? 1 : 2);
    buckets.set("space", [...space].sort((a, b) => rank(a) - rank(b)));
  }

  return NOTE_SECTIONS.filter((s) => buckets.get(s.key)?.length)
    .map((s) => [s.title, ...buckets.get(s.key)!].join("\n"))
    .join("\n\n");
}

/** Dòng tiêu đề mục (VD "🎉 TIỆN ÍCH MIỄN PHÍ") — để trang chi tiết in đậm. */
export function isNoteHeading(line: string): boolean {
  const t = line.trim();
  return NOTE_SECTIONS.some((s) => s.title === t) || /^[^\p{L}\d]*\s?[A-ZÀ-Ỹ0-9 &–\-]{4,}$/u.test(t);
}
