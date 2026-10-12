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
  if (specs.length) lines.push(`🛏️ ${specs.join(" · ")}`);
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
// Rút gọn nội dung dán từ nơi khác (Zalo / Facebook / file chủ nhà gửi) —
// bản KHÔNG cần AI: bỏ emoji trang trí, hashtag, câu quảng cáo, dòng trùng;
// giữ các dòng có thông tin thật (phòng, giường, tiện ích, giờ nhận/trả,
// phụ thu, cọc, khoảng cách...). Có API key AI thì route sẽ dùng AI thay thế.
// ---------------------------------------------------------------------------
const KEEP_HINTS =
  /(phong|pn\b|giuong|wc|toilet|nha ve sinh|khach|nguoi|be boi|ho boi|bể bơi|karaoke|bbq|nuong|bep|san |sân|view|ho\b|bien|cach|km|phut|check|nhan phong|tra phong|gio|phu thu|coc|dat coc|huy|tre em|thu cung|pet|xe|bai do|wifi|tivi|tv|dieu hoa|nong lanh|bida|bi-a|pickleball|tennis|golf|xong hoi|jacuzzi|bon tam|loa|am thanh|an |do an|nau|dien tich|m2|tang|lau|san vuon|gia|trieu|tr\b|k\b|\d)/;
const DROP_HINTS =
  /(^chao |^xin chao|kinh chao|^hello|inbox|ib\b|lien he ngay|lh ngay|dat ngay|nhanh tay|so luong co han|uu dai khung|hot hot|share|tha tim|follow|zalo:|hotline|sdt|so dien thoai|www\.|http|fanpage|kenh|page\b|chuc quy khach|tran trong|xin cam on|cam on)/;

function plainVN(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

export function summarizeNoteBasic(raw: string, maxLines = 14): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const pieces = raw
    .replace(/\r/g, "")
    .split(/\n|(?<=[.!?])\s+(?=[A-ZÀ-Ỹ0-9])/)
    .map((l) =>
      l
        .replace(/#[\p{L}\p{N}_]+/gu, " ") // hashtag
        .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, " ") // emoji
        .replace(/^[\s\-–—•*+>✓✔☑️·.,:;|]+/u, "") // gạch đầu dòng cũ
        .replace(/([!?.~])\1+/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((l) => l.length >= 4);

  const kept: string[] = [];
  for (const line of pieces) {
    const p = plainVN(line);
    if (SECTION_TITLES_PLAIN.has(p.replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim())) continue;
    if (DROP_HINTS.test(p)) continue;
    if (!KEEP_HINTS.test(p)) continue;
    const key = p.replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const short = line.length > 140 ? line.slice(0, 137).replace(/\s+\S*$/, "") + "…" : line;
    kept.push(short.charAt(0).toUpperCase() + short.slice(1));
    if (kept.length >= maxLines) break;
  }
  return formatNoteSections(kept);
}

// ---------------------------------------------------------------------------
// KHUNG NỘI DUNG ĐỒNG NHẤT cho mọi căn: chia mục cố định, mỗi dòng 1 sticker
// đúng nghĩa (🏊 hồ bơi, 🎤 karaoke, 🍖 BBQ...). Dùng cho bản lọc miễn phí;
// bản AI cũng được yêu cầu viết theo đúng khung này.
// ---------------------------------------------------------------------------
export const NOTE_SECTIONS = [
  { key: "space", title: "🏡 KHÔNG GIAN" },
  { key: "amenity", title: "🎉 TIỆN ÍCH" },
  { key: "location", title: "📍 VỊ TRÍ & VIEW" },
  { key: "time", title: "⏰ NHẬN – TRẢ PHÒNG" },
  { key: "policy", title: "📌 CHÍNH SÁCH" },
  { key: "other", title: "✨ ĐIỂM CỘNG" },
] as const;
type SectionKey = (typeof NOTE_SECTIONS)[number]["key"];
const SECTION_TITLES_PLAIN = new Set(
  NOTE_SECTIONS.map((x) => plainVN(x.title).replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim())
);

/** Thứ tự kiểm tra quan trọng: dòng khớp mục nào trước thì vào mục đó. */
const RULES: { section: SectionKey; re: RegExp; icon: string }[] = [
  { section: "time", re: /check ?in|check ?out|nhan phong|tra phong/, icon: "🕑" },
  { section: "policy", re: /phu thu|phi /, icon: "💵" },
  { section: "policy", re: /dat coc|\bcoc\b|huy phong|\bhuy\b|hoan/, icon: "🧾" },
  { section: "policy", re: /tre em|tre nho|em be/, icon: "👶" },
  { section: "policy", re: /thu cung|\bpet\b|cho meo/, icon: "🐾" },
  { section: "policy", re: /khong (duoc|hut|mang)|cam |luu y|noi quy/, icon: "⚠️" },
  { section: "amenity", re: /be boi|ho boi|pool|tran bo|vo cuc/, icon: "🏊" },
  { section: "amenity", re: /karaoke|hat |loa|am thanh|dan /, icon: "🎤" },
  { section: "amenity", re: /bbq|nuong/, icon: "🍖" },
  { section: "amenity", re: /bida|bi-a|billiard/, icon: "🎱" },
  { section: "amenity", re: /pickleball|tennis|cau long|bong ban|the thao|golf/, icon: "🏓" },
  { section: "amenity", re: /jacuzzi|bon tam|xong hoi|spa|sauna/, icon: "🛁" },
  { section: "amenity", re: /cau truot|san choi|tre em choi|xich du/, icon: "🛝" },
  { section: "amenity", re: /bep|nau an|lo nuong|tu lanh|dung cu/, icon: "🍳" },
  { section: "amenity", re: /wifi|tivi|\btv\b|netflix|dieu hoa|nong lanh/, icon: "📺" },
  { section: "amenity", re: /lua trai|dot lua|camping|cam trai/, icon: "🔥" },
  { section: "amenity", re: /xe dien|xe dap|bai do|do xe|o to/, icon: "🚗" },
  { section: "space", re: /phong ngu|\bpn\b|giuong|nem/, icon: "🛏️" },
  { section: "space", re: /\bwc\b|toilet|nha ve sinh|phong tam/, icon: "🚿" },
  { section: "space", re: /phong khach|sanh|tang|lau|dien tich|m2|san vuon|khuon vien|ban cong/, icon: "🏠" },
  { section: "space", re: /\bkhach\b|nguoi|suc chua/, icon: "👨‍👩‍👧‍👦" },
  { section: "location", re: /view|nhin ra|huong/, icon: "🌅" },
  { section: "location", re: /ven ho|ho\b|bien|nui|doi|rung|suoi/, icon: "🏞️" },
  { section: "location", re: /cach|km|phut|gan|trung tam|di bo/, icon: "📍" },
];

function classify(line: string): { section: SectionKey; icon: string } {
  const p = plainVN(line);
  for (const r of RULES) if (r.re.test(p)) return { section: r.section, icon: r.icon };
  return { section: "other", icon: "✨" };
}

/** Xếp các ý vào khung mục cố định, mỗi ý 1 sticker. */
export function formatNoteSections(lines: string[]): string {
  const buckets = new Map<SectionKey, string[]>();
  for (const line of lines) {
    const { section, icon } = classify(line);
    const text = line.replace(/\.$/, "");
    buckets.set(section, [...(buckets.get(section) ?? []), `${icon} ${text}`]);
  }
  const blocks: string[] = [];
  for (const s of NOTE_SECTIONS) {
    const items = buckets.get(s.key);
    if (items?.length) blocks.push([s.title, ...items].join("\n"));
  }
  return blocks.join("\n\n");
}

/** Dòng tiêu đề mục (VD "🎉 TIỆN ÍCH") — để trang chi tiết in đậm. */
export function isNoteHeading(line: string): boolean {
  const t = line.trim();
  return NOTE_SECTIONS.some((s) => s.title === t) || /^[^\p{L}\d]*\s?[A-ZÀ-Ỹ0-9 &–\-]{4,}$/u.test(t);
}

