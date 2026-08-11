export function formatVND(amount: number | null | undefined): string {
  if (amount == null) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

export function formatVNDShort(amount: number | null | undefined): string {
  if (amount == null) return "Liên hệ";
  if (amount >= 1_000_000) {
    const trieu = amount / 1_000_000;
    return `${trieu % 1 === 0 ? trieu.toFixed(0) : trieu.toFixed(1)} triệu`;
  }
  return formatVND(amount);
}
