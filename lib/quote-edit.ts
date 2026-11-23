// Thao tác sửa báo giá (thuần) — dùng với cập nhật dạng hàm để luôn áp lên state mới nhất.
import type { QuoteItem, QuoteOption } from "@/lib/quote-types";

export type ProductPick = { option: Pick<QuoteOption, "name" | "place" | "image_url" | "highlights" | "product_id">; items: QuoteItem[] };

/** Thêm sản phẩm chọn từ kho vào phương án: chỉ điền ô đang trống, nối thêm dòng "Nơi nghỉ". */
export function applyPick(o: QuoteOption, pick: ProductPick): QuoteOption {
  return {
    ...o,
    name: o.name || pick.option.name,
    place: o.place || pick.option.place,
    image_url: o.image_url || pick.option.image_url,
    highlights: o.highlights.some(Boolean) ? o.highlights : pick.option.highlights,
    product_id: o.product_id ?? pick.option.product_id,
    items: [...o.items, ...pick.items],
  };
}
