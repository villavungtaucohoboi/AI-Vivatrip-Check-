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

// Bỏ các ký tự trang trí hay gặp (emoji check, gạch đầu dòng, hai chấm...) để
// kiểm tra xem sau khi bỏ ngày, dòng có còn nội dung gì đáng kể không.
function stripDecoration(s: string): string {
  return s
    .replace(/[\u2700-\u27bf\u2600-\u26ff\u2000-\u206f\ufe0f]/gu, "")
    .replace(/[-–—:.,•*]+/g, "")
    .trim();
}

/**
 * Tách nội dung sale paste thành danh sách { name, ngày quỹ, giá }.
 *
 * Hỗ trợ 2 kiểu viết:
 * 1. Ngày đi kèm ngay trên từng dòng: "Mộc villa sóc sơn 29/8 - 9tr"
 * 2. Ngày viết riêng 1 dòng, áp dụng cho các dòng villa phía dưới cho tới khi
 *    gặp dòng ngày tiếp theo (kiểu sale hay dùng thực tế):
 *      22/8 :
 *      -5PN B house sóc sơn ... thu 9,5 ...
 *      -5PN Tekapo sóc sơn ... thu 10,5 ...
 *
 * Không đoán khi không chắc — trường nào không nhận diện được sẽ để null,
 * nhưng raw_line luôn giữ nguyên văn dòng gốc, và dòng "chỉ có ngày" không bị
 * tính là 1 quỹ (chỉ dùng để cập nhật ngày áp dụng cho các dòng sau).
 */
export function parseHolidayFundText(rawText: string, defaultYear: number): ParsedFundLine[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedFundLine[] = [];
  let currentDate: DateMatchInfo | null = null;

  for (const line of lines) {
    const dateInfo = parseDateFromText(line, defaultYear);

    if (dateInfo) {
      const before = stripDecoration(line.slice(0, dateInfo.index));
      const after = stripDecoration(line.slice(dateInfo.index + dateInfo.length));
      if (!before && !after) {
        currentDate = dateInfo;
        continue;
      }
    }

    // Dòng ghi chú tiếp nối (tiền cọc...) của villa ngay phía trên, không phải
    // 1 villa mới -> bỏ qua, tránh tính lố thành 1 quỹ riêng.
    if (!dateInfo && /^[-–—•*]*\s*cọc\b/i.test(line)) {
      continue;
    }

    const effectiveDate = dateInfo ?? currentDate;

    let name: string;
    let searchAfter: string;
    if (dateInfo) {
      name = line.slice(0, dateInfo.index).trim().replace(/[-–—,]+$/, "").trim();
      searchAfter = line.slice(dateInfo.index + dateInfo.length);
    } else {
      const priceKeywordMatch = line.match(/\bthu\b/i);
      const cut = priceKeywordMatch ? priceKeywordMatch.index! : line.length;
      name = line.slice(0, cut).trim().replace(/^[-–—•*]+/, "").trim();
      searchAfter = line;
    }

    const price = parsePriceFromText(searchAfter) ?? parsePriceFromText(line);

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
