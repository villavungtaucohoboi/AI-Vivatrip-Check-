/**
 * Chuẩn hóa tên khu vực trước khi lưu vào DB — để "sóc sơn", "SÓC SƠN",
 * "Sóc  Sơn" (nhiều khoảng trắng)... đều lưu thành cùng 1 giá trị "Sóc Sơn".
 * Áp dụng mỗi khi thêm/sửa sản phẩm hoặc import Excel, để bộ lọc khu vực
 * không bao giờ bị tách thành 2 lựa chọn cho cùng 1 khu vực nữa.
 */
export function normalizeAreaName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}
