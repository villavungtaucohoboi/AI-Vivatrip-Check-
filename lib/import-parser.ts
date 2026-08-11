import * as XLSX from "xlsx";
import type { ImportRow, ImportRowResult, ProductType } from "./types";

const TYPE_MAP: Record<string, ProductType> = {
  villa: "villa",
  hotel: "hotel",
  resort: "resort",
  "khach san": "hotel",
  "khách sạn": "hotel",
};

function normalizeTypeValue(raw: unknown): ProductType | null {
  const s = String(raw ?? "").trim().toLowerCase();
  return TYPE_MAP[s] ?? null;
}

function parseBool(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "").trim().toLowerCase();
  return ["1", "true", "x", "co", "có", "yes", "y"].includes(s);
}

function parseNumberOrUndefined(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const REQUIRED_COLUMNS = ["product_code", "product_name", "type", "area"] as const;
export const IMPORT_TEMPLATE_COLUMNS = [
  "product_code",
  "product_name",
  "type",
  "area",
  "address",
  "bedrooms",
  "beds",
  "standard_guests",
  "max_guests",
  "price",
  "price_weekday",
  "price_friday_sunday",
  "price_saturday_holiday",
  "discount_percent",
  "pool",
  "near_beach",
  "karaoke",
  "bbq",
  "note",
] as const;

export function parseWorkbook(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
}

export function validateRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  existingCodes: Set<string>
): ImportRowResult {
  const product_code = String(raw.product_code ?? "").trim();
  const product_name = String(raw.product_name ?? "").trim();
  const area = String(raw.area ?? "").trim();
  const type = normalizeTypeValue(raw.type);

  const missing = REQUIRED_COLUMNS.filter((col) => !String(raw[col] ?? "").trim());

  const base: ImportRow = {
    product_code,
    product_name,
    type: String(raw.type ?? "").trim(),
    area,
    address: String(raw.address ?? "").trim() || undefined,
    bedrooms: parseNumberOrUndefined(raw.bedrooms),
    beds: parseNumberOrUndefined(raw.beds),
    standard_guests: parseNumberOrUndefined(raw.standard_guests),
    max_guests: parseNumberOrUndefined(raw.max_guests),
    price: parseNumberOrUndefined(raw.price),
    price_weekday: parseNumberOrUndefined(raw.price_weekday),
    price_friday_sunday: parseNumberOrUndefined(raw.price_friday_sunday),
    price_saturday_holiday: parseNumberOrUndefined(raw.price_saturday_holiday),
    discount_percent: parseNumberOrUndefined(raw.discount_percent),
    pool: parseBool(raw.pool),
    near_beach: parseBool(raw.near_beach),
    karaoke: parseBool(raw.karaoke),
    bbq: parseBool(raw.bbq),
    note: String(raw.note ?? "").trim() || undefined,
  };

  if (missing.length > 0) {
    return {
      ...base,
      _status: "error",
      _rowNumber: rowNumber,
      _error: `Thiếu cột bắt buộc: ${missing.join(", ")}`,
    };
  }

  if (!type) {
    return {
      ...base,
      _status: "error",
      _rowNumber: rowNumber,
      _error: `Loại sản phẩm không hợp lệ: "${raw.type}" (chỉ nhận villa / hotel / resort)`,
    };
  }

  if (
    type !== "hotel" &&
    (base.price_weekday == null || base.price_friday_sunday == null || base.price_saturday_holiday == null)
  ) {
    return {
      ...base,
      type,
      _status: "error",
      _rowNumber: rowNumber,
      _error: "Villa/resort thiếu giá: cần đủ price_weekday, price_friday_sunday, price_saturday_holiday",
    };
  }

  return {
    ...base,
    type,
    _status: existingCodes.has(product_code) ? "update" : "new",
    _rowNumber: rowNumber,
  };
}

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const villaSample = {
    product_code: "VIL-PTH-999",
    product_name: "Villa Mẫu Phan Thiết",
    type: "villa",
    area: "Phan Thiết",
    address: "Địa chỉ mẫu",
    bedrooms: 4,
    beds: 8,
    standard_guests: 8,
    max_guests: 12,
    price: "",
    price_weekday: 6000000,
    price_friday_sunday: 8000000,
    price_saturday_holiday: 10000000,
    discount_percent: 10,
    pool: "TRUE",
    near_beach: "TRUE",
    karaoke: "FALSE",
    bbq: "TRUE",
    note: "Ghi chú mẫu",
  };
  const hotelSample = {
    product_code: "HOT-PTH-999",
    product_name: "Hotel Mẫu Phan Thiết",
    type: "hotel",
    area: "Phan Thiết",
    address: "Địa chỉ mẫu",
    bedrooms: "",
    beds: "",
    standard_guests: "",
    max_guests: "",
    price: 1800000,
    price_weekday: "",
    price_friday_sunday: "",
    price_saturday_holiday: "",
    discount_percent: "",
    pool: "TRUE",
    near_beach: "TRUE",
    karaoke: "FALSE",
    bbq: "FALSE",
    note: "Bảng giá phòng nhập riêng trong trang chi tiết khách sạn",
  };
  const ws = XLSX.utils.json_to_sheet([villaSample, hotelSample], { header: [...IMPORT_TEMPLATE_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "products");
  return wb;
}
