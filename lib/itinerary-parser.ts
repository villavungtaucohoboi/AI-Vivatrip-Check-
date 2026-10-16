/**
 * Chuẩn hoá lịch trình du thuyền từ bài chủ tàu gửi (dán nguyên văn) thành
 * các dòng "giờ | nội dung" mà app dùng để vẽ ảnh lịch trình.
 * MIỄN PHÍ — không gọi AI, chỉ dùng quy tắc:
 *  - đọc chữ "kiểu" Facebook (𝐁𝐨𝐥𝐝) nhờ NFKC, bỏ emoji, hashtag, link, SĐT
 *  - nhận giờ ở đầu dòng: 07:30 · 7h30 · 7h · 10h30 - 11h15 · 07.30
 *  - nhận "Ngày 1", "Day 2", "Sáng/Trưa/Chiều/Tối"
 *  - dòng không có giờ (gạch đầu dòng bên dưới) được nối vào mốc giờ phía trên
 *  - BỎ các dòng nói về GIÁ (giá chỉ để Sale xem, không gửi khách)
 */

const PRICE = /(\d[\d.,]*\s*(đ|đồng|vnđ|vnd|k|tr|triệu)(?![a-zà-ỹ])|giá|price|\/\s*(khách|người|pax))/iu;
const DROP = /(inbox|hotline|liên hệ|lh:|zalo|sđt|số điện thoại|đặt ngay|ưu đãi|khuyến mãi|https?:\/\/|www\.)/iu;
const TIME =
  /^(\d{1,2}\s*(?:[:h.]\s*\d{2}|h)(?:\s*(?:-|–|—|đến|to)\s*\d{1,2}\s*(?:[:h.]\s*\d{2}|h))?)\s*[:\-–—|.)]*\s*(.*)$/iu;
const PART_OF_DAY = /^(sáng|trưa|chiều|tối|đêm|buổi sáng|buổi trưa|buổi chiều|buổi tối)\s*[:\-–—|]+\s*(.*)$/iu;
const DAY = /^(ngày|day)\s*(\d+)\s*[:\-–—|.)]*\s*(.*)$/iu;

function clean(line: string): string {
  return line
    .normalize("NFKC")
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/0\d{2,3}[.\s]?\d{3}[.\s]?\d{3,4}/g, " ")
    .replace(/^[\s\-–—•*+>·✓✔]+/u, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;]+$/g, "")
    .trim();
}

function normTime(t: string): string {
  // "7h30" "07:30" "7.30" "7 h" → "07h30" / "07h"
  return t
    .replace(/\s+/g, "")
    .replace(/(\d{1,2})[:.](\d{2})/g, "$1h$2")
    .replace(/(^|[^\d])(\d)h/g, "$10$2h")
    .replace(/[–—]|đến|to/gi, "-")
    .replace(/-/g, " - ");
}

function stripPrice(line: string): string {
  return line
    .replace(/\([^)]*\d[\d.,]*\s*(đ|đồng|vnđ|vnd|k|tr|triệu)[^)]*\)/giu, "")
    .replace(/[,;–-]?\s*(giá|phụ thu|chi phí)?\s*\d[\d.,]*\s*(đ|đồng|vnđ|vnd|k|tr|triệu)(?![a-zà-ỹ])(\s*\/\s*(khách|người|pax|suất))?/giu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;:–-]+$/g, "")
    .trim();
}

/** Rút ngắn câu dài: giữ ý đầu (đến dấu ":" / "." / "–" đầu tiên nếu đủ nghĩa), tối đa ~90 ký tự. */
function shorten(text: string): string {
  let t = text.trim();
  const firstStop = t.search(/[.;]\s|:\s|\s[–—-]\s/);
  if (t.length > 90 && firstStop >= 12) t = t.slice(0, firstStop);
  t = t.replace(/^(quý khách|du khách|đoàn)\s+/i, "").replace(/[.,;:\s]+$/, "");
  if (t.length > 110) t = t.slice(0, 107).replace(/\s+\S*$/, "") + "…";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseItinerary(raw: string): string {
  const out: { time: string; text: string }[] = [];
  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = clean(rawLine);
    if (line.length < 2) continue;
    if (DROP.test(line) || /^(giá|price)/iu.test(line)) continue;
    // Bỏ phần nói về tiền trong câu, giữ phần hoạt động: "(tự túc 150k/người)"
    const noPrice = stripPrice(line);
    if (!noPrice || noPrice.length < 3) continue;
    if (noPrice !== line && PRICE.test(noPrice)) continue;
    // Tiêu đề viết HOA toàn bộ / có chữ "lịch trình" và chưa có mốc giờ → bỏ
    if (!out.length && (/lịch trình|chương trình/iu.test(noPrice) || (/\p{L}{3}/u.test(noPrice) && noPrice === noPrice.toUpperCase()))) continue;

    const lineX = noPrice;
    const day = lineX.match(DAY);
    if (day) {
      out.push({ time: `NGÀY ${day[2]}`, text: day[3] });
      continue;
    }
    const t = lineX.match(TIME);
    if (t) {
      // Giờ nằm 1 dòng riêng ("09:00") → nội dung ở dòng kế tiếp sẽ được điền vào
      out.push({ time: normTime(t[1]), text: t[2] ?? "" });
      continue;
    }
    const pod = lineX.match(PART_OF_DAY);
    if (pod && pod[2]) {
      out.push({ time: pod[1].replace(/^buổi\s+/i, "").replace(/^./, (c) => c.toUpperCase()), text: pod[2] });
      continue;
    }
    // Dòng không có giờ: nối vào mốc phía trên (nếu có), không thì thành 1 mốc không giờ
    const last = out[out.length - 1];
    if (last && !last.text) last.text = lineX;
    else if (last && !/^NGÀY/.test(last.time)) last.text = last.text ? `${last.text}, ${lineX.charAt(0).toLowerCase()}${lineX.slice(1)}` : lineX;
    else if (last && /^NGÀY/.test(last.time) && !last.text) last.text = lineX;
    else out.push({ time: "", text: lineX });
  }
  return out
    .map(({ time, text }) => {
      const tx = shorten(text);
      return time ? (tx ? `${time} | ${tx}` : time) : tx;
    })
    .join("\n");
}
