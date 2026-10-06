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
  price_adult: number;
  price_child: number;
  discount_percent: number;
  meals: CruiseMeal[];
  services: string[];
  itinerary: string;
  note: string | null;
  sort_order: number;
  is_active: boolean;
  cabins: CruiseCabin[];
  files: CruiseFile[];
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
  lines.push(`${c.duration_label ?? CRUISE_CATEGORY_LABEL[c.category]}${c.star ? ` · ${c.star} sao` : ""}`);
  const adult = priceAfterPercent(c.price_adult, c.discount_percent);
  const child = priceAfterPercent(c.price_child, c.discount_percent);
  lines.push(`Giá người lớn: ${vnd(adult)}đ · Trẻ em: ${vnd(child)}đ${c.discount_percent ? ` (đã chiết khấu ${c.discount_percent}%)` : ""}`);
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
