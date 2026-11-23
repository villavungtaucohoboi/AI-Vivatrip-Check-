// BÁO GIÁ CHƯƠNG TRÌNH — kiểu dữ liệu + hằng số dùng chung (client & server).
// Lưu trong bảng public.quotes (migration 0032): customer/program/options là jsonb.

export type QuoteGroup = "Nơi nghỉ" | "Vận chuyển" | "Ăn uống & vui chơi" | "Khác";
/** Thứ tự cố định khi hiển thị */
export const QUOTE_GROUPS: QuoteGroup[] = ["Nơi nghỉ", "Vận chuyển", "Ăn uống & vui chơi", "Khác"];

export interface QuoteItem {
  id: string;
  group: QuoteGroup;
  name: string;
  /** Ghi chú ngắn hiện dưới tên dịch vụ (VD "Chưa gồm đồ uống") */
  note: string;
  /** Số lượng — trống tính là 1 */
  qty: number | null;
  qty_unit: string;
  /** Số đêm / số bữa / số ngày — trống tính là 1 */
  times: number | null;
  times_unit: string;
  /** Đơn giá — trống = "Theo thực tế", không cộng vào tổng */
  unit_price: number | null;
  /** Cộng VAT (theo vat_rate của báo giá) cho dòng này */
  vat: boolean;
}

export interface QuoteOption {
  id: string;
  name: string;
  place: string;
  image_url: string;
  highlights: string[];
  product_id: string | null;
  items: QuoteItem[];
}

export interface QuoteCustomer {
  name: string;
  company: string;
  phone: string;
  email: string;
}

export interface QuoteProgram {
  title: string;
  date_from: string | null;
  date_to: string | null;
  /** VD "20 người lớn" */
  pax_text: string;
  /** Số khách để tính giá trung bình / khách */
  pax_count: number | null;
  itinerary_note: string;
}

export interface QuoteInput {
  status: "draft" | "sent";
  customer: QuoteCustomer;
  program: QuoteProgram;
  options: QuoteOption[];
  notes: string[];
  vat_rate: number;
  valid_until: string | null;
  sale_name: string;
  sale_phone: string;
}

export interface Quote extends QuoteInput {
  id: string;
  code: string;
  number: string;
  created_at: string;
  updated_at: string;
}

/** Dòng gọn cho danh sách báo giá */
export type QuoteSummary = Pick<Quote, "id" | "code" | "number" | "status" | "customer" | "program" | "updated_at"> & {
  optionCount: number;
  minTotal: number | null;
};

export const COMPANY = {
  name: "CÔNG TY CỔ PHẦN XÂY DỰNG VÀ DU LỊCH VIVA",
  address: "71 Trần Đăng Ninh, Hà Đông, Hà Nội",
  hotline: "Hotline 0942 988 699",
  email: "info@vivatrip.vn",
  website: "vivatrip.vn",
};

const preset = (group: QuoteGroup, name: string, qty_unit: string, times_unit: string, note = ""): Omit<QuoteItem, "id"> => ({
  group,
  name,
  note,
  qty: null,
  qty_unit,
  times: null,
  times_unit,
  unit_price: null,
  vat: group !== "Nơi nghỉ",
});

/** Dịch vụ hay dùng — không có giá sẵn, sale tự điền */
export const PRESET_ITEMS: Omit<QuoteItem, "id">[] = [
  preset("Vận chuyển", "Xe 16 chỗ đưa đón", "xe", "", "2 chiều"),
  preset("Vận chuyển", "Xe 29 chỗ đưa đón", "xe", "", "2 chiều"),
  preset("Vận chuyển", "Xe 45 chỗ đưa đón", "xe", "", "2 chiều"),
  preset("Vận chuyển", "Dừng đợi ăn trưa trên đường", "lượt", ""),
  preset("Ăn uống & vui chơi", "Bữa sáng", "khách", "bữa"),
  preset("Ăn uống & vui chơi", "Bữa trưa tại nhà hàng", "khách", "bữa", "Chưa gồm đồ uống"),
  preset("Ăn uống & vui chơi", "Bữa tối tại nhà hàng", "khách", "bữa", "Chưa gồm đồ uống"),
  preset("Ăn uống & vui chơi", "Tiệc BBQ", "khách", "bữa"),
  preset("Ăn uống & vui chơi", "Gala dinner", "khách", "bữa"),
  preset("Ăn uống & vui chơi", "Hướng dẫn viên", "người", "ngày"),
  preset("Ăn uống & vui chơi", "Sân pickleball", "sân", "giờ", "Chưa gồm vợt, bóng"),
  preset("Khác", "Bảo hiểm du lịch", "khách", ""),
];

export const DEFAULT_NOTES: string[] = [
  "Giá phòng đã gồm VAT & phí dịch vụ; xe và ăn uống cộng thêm VAT 8%.",
  "Báo giá có hiệu lực đến ngày ghi ở đầu báo giá, phụ thuộc tình trạng phòng tại thời điểm đặt.",
];

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyItem(group: QuoteGroup): QuoteItem {
  return { id: newId(), group, name: "", note: "", qty: null, qty_unit: "", times: null, times_unit: "", unit_price: null, vat: group !== "Nơi nghỉ" };
}

export function emptyOption(): QuoteOption {
  return { id: newId(), name: "", place: "", image_url: "", highlights: [], product_id: null, items: [] };
}

/** `today` dạng YYYY-MM-DD */
export function emptyQuoteInput(today: string): QuoteInput {
  const [y, m, d] = today.split("-").map(Number);
  const v = new Date(Date.UTC(y, m - 1, d + 7));
  return {
    status: "draft",
    customer: { name: "", company: "", phone: "", email: "" },
    program: { title: "", date_from: null, date_to: null, pax_text: "", pax_count: null, itinerary_note: "" },
    options: [emptyOption()],
    notes: [...DEFAULT_NOTES],
    vat_rate: 8,
    valid_until: v.toISOString().slice(0, 10),
    sale_name: "",
    sale_phone: "",
  };
}
