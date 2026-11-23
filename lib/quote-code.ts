// Mã link báo giá + số báo giá hiển thị.

/** Bỏ 0/O/1/I/L để khách đọc mã không nhầm */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function cryptoRand(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}

export function randomCode(len = 8, rand: () => number = cryptoRand): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return s;
}

/** "BG-2611-018" */
export function quoteNumber(date: Date, seq: number): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `BG-${yy}${mm}-${String(seq).padStart(3, "0")}`;
}

/** Số BG tiếp theo trong tháng = số lớn nhất đã có + 1 (xoá báo giá không làm số bị dùng lại) */
export function nextQuoteNumber(existing: string[], date: Date): string {
  const prefix = quoteNumber(date, 0).slice(0, -3);
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(prefix)) continue;
    const v = Number(n.slice(prefix.length));
    if (Number.isInteger(v) && v > max) max = v;
  }
  return quoteNumber(date, max + 1);
}
