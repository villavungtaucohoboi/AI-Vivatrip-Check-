import type { Product } from "@/lib/types";

/**
 * GỘP ĐỐI TÁC: cùng 1 khách sạn có thể có giá từ nhiều đối tác (Mustgo, đối tác B…),
 * mỗi đối tác là 1 sản phẩm riêng. Các sản phẩm cùng "nhóm" = cùng khách sạn.
 * Nhóm = cột group_key (Admin tự đặt khi tên khác nhau), mặc định suy ra từ TÊN.
 */
export function hotelKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\b(hotel|resort|khach san|and|&|spa|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}
export function groupKeyOf(p: Pick<Product, "product_name"> & { group_key?: string | null }): string {
  return p.group_key?.trim() ? hotelKey(p.group_key) : hotelKey(p.product_name);
}
/** "Mustgo · 092 5959 777" → "mustgo" (so sánh đối tác) */
export function sourceKey(s: string | null | undefined): string {
  return (s ?? "").split(/[·|,(-]/)[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
export function sourceLabel(s: string | null | undefined): string {
  return (s ?? "").split("·")[0].trim() || "Chưa ghi đối tác";
}
