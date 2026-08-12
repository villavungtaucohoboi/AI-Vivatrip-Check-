export interface ParsedFundLine {
  name: string | null;
  fund_date_iso: string | null; // YYYY-MM-DD
  fund_date_display: string | null; // dd/mm
  price: number | null;
  raw_line: string;
}

function parsePriceFromText(text: string): number | null {
  // "9tr5" -> 9.5 triệu
  let m = text.match(/(\d+)\s*tr\s*(\d)\b/i);
  if (m) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10) / 10) * 1_000_000);

  // "9tr", "9 triệu", "9.5tr", "9,5tr"
  m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)\b/i);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000);

  // "10.000.000"
  m = text.match(/\b(\d{1,3}(?:\.\d{3})+)\b/);
  if (m) return parseInt(m[1].replace(/\./g, ""), 10);

  // "10000000"
  m = text.match(/\b(\d{6,})\b/);
  if (m) return parseInt(m[1], 10);

  // "2200k", "1900k" — giá phòng khách sạn hay viết tắt đơn vị nghìn
  m = text.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000);

  // "thu 9,5", "thu 7", "thu 10,5" — cách viết tắt phổ biến của sale, ngầm hiểu
  // đơn vị triệu (giá villa/khách sạn theo ngày không ai viết đơn vị nghìn/đồng).
  m = text.match(/\bthu\b\s*:?\s*(\d+(?:[.,]\d+)?)\b/i);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000);

  return null;
}

interface DateMatchInfo {
  iso: string;
  display: string;
  index: number;
  length: number;
}

function buildDate(day: number, month: number, year: number, index: number, length: number): DateMatchInfo | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const display = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
  return { iso, display, index, length };
}

function parseDateFromText(text: string, year: number): DateMatchInfo | null {
  // Ưu tiên dạng có dấu "/" — ít nhầm với mã phòng kiểu "A8-21" hơn dấu "-"
  const slashMatches = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\b/g)];
  if (slashMatches.length > 0) {
    const last = slashMatches[slashMatches.length - 1];
    return buildDate(parseInt(last[1], 10), parseInt(last[2], 10), year, last.index!, last[0].length);
  }

  // Dấu "-" chỉ nhận nếu không đứng sát chữ cái/số (tránh nhầm mã phòng "A8-21")
  const dashMatches = [...text.matchAll(/(?<![A-Za-zÀ-ỹ0-9])(\d{1,2})-(\d{1,2})(?!\d)/g)];
  if (dashMatches.length > 0) {
    const last = dashMatches[dashMatches.length - 1];
    return buildDate(parseInt(last[1], 10), parseInt(last[2], 10), year, last.index!, last[0].length);
  }

  return null;
}

// Bỏ emoji/ký tự trang trí hay gặp (📍✅👉 gạch đầu dòng, hai chấm...) để lấy
// phần chữ thật sự còn lại trong dòng.
function stripDecoration(s: string): string {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u2700-\u27bf\u2600-\u26ff\u2000-\u206f\ufe0f]/gu, "")
    .replace(/[-–—:.,•*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tách nội dung sale paste thành danh sách { name, ngày quỹ, giá }.
 *
 * Hỗ trợ các kiểu viết thực tế hay gặp:
 * 1. Tên + ngày + giá chung 1 dòng: "Mộc villa sóc sơn 29/8 - 9tr"
 * 2. Dòng NGÀY riêng, áp dụng cho các dòng villa phía dưới:
 *      22/8 :
 *      -5PN B house sóc sơn ... thu 9,5 ...
 * 3. Dòng TÊN khách sạn riêng (thường có 📍), áp dụng cho các dòng ngày/giá
 *    phía dưới cho tới khi gặp tên khách sạn tiếp theo:
 *      📍 Mường Thanh Luxury Centre 1 (TÒA A) ăn 2 bữa
 *      • 29/08: 20p Deluxe city x 2200k
 *      • 30/08: 20p Deluxe city x 1900k
 *
 * Nguyên tắc: 1 dòng chỉ được tính là 1 quỹ khi xác định được cả NGÀY lẫn GIÁ
 * (dù ngày/tên có thể kế thừa từ dòng tiêu đề phía trên). Dòng chỉ có ngày mà
 * không có giá (tiêu đề ngày, dòng banner nhắc tới ngày...) hoặc chỉ có chữ mà
 * không có ngày lẫn giá (tên khách sạn, ghi chú...) được dùng để cập nhật ngữ
 * cảnh (ngày/tên hiện hành) chứ không tạo thành 1 quỹ riêng — tránh đếm lố.
 * raw_line luôn giữ nguyên văn dòng gốc.
 */
export function parseHolidayFundText(rawText: string, defaultYear: number): ParsedFundLine[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedFundLine[] = [];
  let currentDate: DateMatchInfo | null = null;
  let currentPropertyName: string | null = null;

  for (const line of lines) {
    // Dòng ghi chú tiếp nối (tiền cọc...) của quỹ ngay phía trên -> bỏ qua.
    if (/^[-–—•*]*\s*cọc\b/i.test(line)) continue;

    const dateInfo = parseDateFromText(line, defaultYear);
    const price = parsePriceFromText(line);

    // Có ngày nhưng không có giá -> dòng tiêu đề ngày/banner, không phải 1 quỹ.
    // Vẫn cập nhật ngày hiện hành cho các dòng sau (nếu dòng đó thực sự là header ngày).
    if (dateInfo && price == null) {
      const before = stripDecoration(line.slice(0, dateInfo.index));
      const after = stripDecoration(line.slice(dateInfo.index + dateInfo.length));
      if (!before && !after) currentDate = dateInfo;
      continue;
    }

    // Không có ngày và không có giá -> dòng tên khách sạn/ghi chú, dùng làm
    // "tên hiện hành" cho các dòng ngày/giá phía dưới, không tạo thành 1 quỹ.
    if (!dateInfo && price == null) {
      const cleaned = stripDecoration(line);
      if (cleaned.length >= 2) currentPropertyName = cleaned;
      continue;
    }

    const effectiveDate = dateInfo ?? currentDate;

    let name: string;
    if (dateInfo) {
      name = stripDecoration(line.slice(0, dateInfo.index));
    } else {
      const priceKeywordMatch = line.match(/\bthu\b/i);
      const cut = priceKeywordMatch ? priceKeywordMatch.index! : line.length;
      name = stripDecoration(line.slice(0, cut));
    }
    // Dòng ngày/giá không tự mang tên riêng (VD "• 29/08: 20p Deluxe city x 2200k")
    // -> lấy tên khách sạn đang áp dụng từ dòng header phía trên.
    if (!name && currentPropertyName) name = currentPropertyName;

    results.push({
      name: name || null,
      fund_date_iso: effectiveDate ? effectiveDate.iso : null,
      fund_date_display: effectiveDate ? effectiveDate.display : null,
      price,
      raw_line: line,
    });
  }

  return results;
}
