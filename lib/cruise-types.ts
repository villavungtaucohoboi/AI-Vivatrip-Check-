export type CruiseCategory = "day" | "night";

export const CRUISE_CATEGORY_LABEL: Record<CruiseCategory, string> = {
  day: "Trong ngày",
  night: "Qua đêm",
};

export interface CruiseMeal {
  label: string;
  included: boolean;
}

/** Dịch vụ có thể tích "bao gồm". Mã (key) lưu trong cruises.services. */
export const CRUISE_SERVICES: { key: string; label: string }[] = [
  { key: "xe", label: "Xe đưa đón" },
  { key: "kayak", label: "Chèo kayak" },
  { key: "hang", label: "Tham quan hang" },
  { key: "ve", label: "Vé tham quan" },
  { key: "tiec", label: "Tiệc / BBQ tối" },
  { key: "cau", label: "Câu mực đêm" },
  { key: "taichi", label: "Tai chi sáng" },
  { key: "nau", label: "Lớp nấu ăn" },
  { key: "spa", label: "Spa" },
  { key: "bh", label: "Bảo hiểm" },
  { key: "nuoc", label: "Nước suối, khăn lạnh" },
];

export interface CruiseCabin {
  id: string;
  cruise_id: string;
  name: string;
  price: number;
  sort_order: number;
}

export interface CruiseChildPrice {
  id?: string;
  age_label: string;
  age_from: number | null;
  age_to: number | null;
  price: number;
}

/** Phân loại: trong ngày = Day Cruise / Dinner Cruise; qua đêm = Vịnh Hạ Long / Vịnh Lan Hạ. */
export const CRUISE_VARIANTS: Record<CruiseCategory, { key: string; label: string }[]> = {
  day: [
    { key: "day_cruise", label: "Day Cruise" },
    { key: "dinner_cruise", label: "Dinner Cruise" },
  ],
  night: [
    { key: "ha_long", label: "Vịnh Hạ Long" },
    { key: "lan_ha", label: "Vịnh Lan Hạ" },
  ],
};

export function defaultVariant(category: CruiseCategory): string {
  return CRUISE_VARIANTS[category][0].key;
}

export function variantLabel(v: string | null | undefined): string {
  if (!v) return "";
  for (const list of Object.values(CRUISE_VARIANTS)) {
    const f = list.find((x) => x.key === v);
    if (f) return f.label;
  }
  return "";
}

/** "từ 5 đến 9 tuổi" */
export function childAgeLabel(from: number | null, to: number | null): string {
  if (from != null && to != null) return from === to ? `${from} tuổi` : `${from}–${to} tuổi`;
  if (from != null) return `từ ${from} tuổi`;
  if (to != null) return `dưới ${to + 1} tuổi`;
  return "Trẻ em";
}

export interface CruiseImage {
  id?: string;
  url: string;
}

export const CRUISE_STARS = [3, 4, 5, 6] as const;

export interface CruiseFile {
  id: string;
  cruise_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface Cruise {
  id: string;
  category: CruiseCategory;
  name: string;
  duration_label: string | null;
  star: number | null;
  variant: string | null;
  price_adult: number;
  price_child: number;
  discount_percent: number;
  meals: CruiseMeal[];
  services: string[];
  itinerary: string;
  note: string | null;
  sort_order: number;
  is_active: boolean;
  capacity: number | null;
  cabin_count: number | null;
  itinerary_url: string | null;
  child_prices: CruiseChildPrice[];
  images: CruiseImage[];
  cabins: CruiseCabin[];
  files: CruiseFile[];
}

/** Link gửi khách: link tuỳ chọn Admin nhập, nếu trống dùng trang riêng của VivaTrip. */
export function cruiseShareUrl(c: Pick<Cruise, "id" | "itinerary_url">, origin: string): string {
  const custom = c.itinerary_url?.trim();
  if (custom) return /^https?:\/\//i.test(custom) ? custom : `https://${custom}`;
  return `${origin}/cruises/${c.id}`;
}

/** Mẫu bữa ăn gợi ý khi tạo mới. */
export function defaultMeals(category: CruiseCategory): CruiseMeal[] {
  return category === "day"
    ? [
        { label: "Ăn sáng", included: false },
        { label: "Ăn trưa buffet", included: true },
        { label: "Ăn tối", included: false },
      ]
    : [
        { label: "Ngày 1 · Ăn trưa", included: true },
        { label: "Ngày 1 · Tiệc tối", included: true },
        { label: "Ngày 2 · Ăn sáng", included: true },
        { label: "Ngày 2 · Brunch", included: true },
      ];
}

export interface MealSummary {
  full: boolean;
  on: string[];
  off: string[];
}

export function mealSummary(meals: CruiseMeal[]): MealSummary {
  const on = meals.filter((m) => m.included).map((m) => m.label);
  const off = meals.filter((m) => !m.included).map((m) => m.label);
  const full = meals.length > 0 && off.length === 0 && (meals.length > 1 || /trọn gói/i.test(meals[0].label));
  return { full, on, off };
}

export function mealText(meals: CruiseMeal[]): string {
  const s = mealSummary(meals);
  if (s.full) return meals.length > 1 ? `Ăn trọn gói các bữa theo lịch trình (${meals.length} bữa)` : "Ăn trọn gói theo lịch trình";
  return s.on.length ? s.on.join(" · ") : "Không bao gồm bữa ăn";
}

export function includedServices(services: string[]): string[] {
  return CRUISE_SERVICES.filter((s) => services.includes(s.key)).map((s) => s.label);
}

export interface ItineraryItem {
  time: string;
  text: string;
}

export function itineraryItems(text: string): ItineraryItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("|");
      return i < 0 ? { time: "", text: line } : { time: line.slice(0, i).trim(), text: line.slice(i + 1).trim() };
    });
}

export function priceAfterPercent(price: number, percent: number): number {
  return percent > 0 ? Math.round(price * (1 - percent / 100)) : price;
}

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/** Nội dung gửi khách (copy dán Zalo / đưa vào file nén). */
export function cruiseQuoteText(c: Cruise): string {
  const lines: string[] = [];
  lines.push(c.name);
  lines.push(`${variantLabel(c.variant) ? `${variantLabel(c.variant)} · ` : ""}${c.duration_label ?? CRUISE_CATEGORY_LABEL[c.category]}${c.star ? ` · ${c.star} sao` : ""}`);
  const adult = priceAfterPercent(c.price_adult, c.discount_percent);
  lines.push(`Giá người lớn: ${vnd(adult)}đ${c.discount_percent ? ` (đã chiết khấu ${c.discount_percent}%)` : ""}`);
  c.child_prices.forEach((x) => lines.push(`Trẻ em ${x.age_label}: ${vnd(priceAfterPercent(x.price, c.discount_percent))}đ`));
  if (c.capacity || c.cabin_count) lines.push([c.capacity ? `${c.capacity} chỗ` : "", c.cabin_count ? `${c.cabin_count} cabin` : ""].filter(Boolean).join(" · "));
  if (c.cabins.length) {
    lines.push("", "Hạng cabin:");
    c.cabins.forEach((x) => lines.push(`- ${x.name}: ${vnd(priceAfterPercent(x.price, c.discount_percent))}đ/khách`));
  }
  lines.push("", `ĂN UỐNG: ${mealText(c.meals)}`);
  const sv = includedServices(c.services);
  lines.push(`DỊCH VỤ BAO GỒM: ${sv.length ? sv.join(", ") : "—"}`);
  const it = itineraryItems(c.itinerary);
  if (it.length) {
    lines.push("", "LỊCH TRÌNH:");
    it.forEach((x) => lines.push(x.time ? `${x.time} — ${x.text}` : x.text));
  }
  if (c.note) lines.push("", `Ghi chú: ${c.note}`);
  lines.push("", "VivaTrip - Hotline 0942.988.699");
  return lines.join("\n");
}
