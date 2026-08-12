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

/**
 * Tách 1 dòng text sale paste thành { name, ngày quỹ, giá }.
 * Không đoán khi không chắc — trường nào không nhận diện được sẽ để null,
 * nhưng raw_line luôn giữ nguyên văn dòng gốc.
 */
export function parseHolidayFundText(rawText: string, defaultYear: number): ParsedFundLine[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    const dateInfo = parseDateFromText(line, defaultYear);
    let name = line;
    let searchAfter = line;

    if (dateInfo) {
      name = line.slice(0, dateInfo.index).trim().replace(/[-–—,]+$/, "").trim();
      searchAfter = line.slice(dateInfo.index + dateInfo.length);
    }
    const price = parsePriceFromText(searchAfter) ?? parsePriceFromText(line);

    return {
      name: name || null,
      fund_date_iso: dateInfo ? dateInfo.iso : null,
      fund_date_display: dateInfo ? dateInfo.display : null,
      price,
      raw_line: line,
    };
  });
}
