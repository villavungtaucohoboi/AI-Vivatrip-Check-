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
