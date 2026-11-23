import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { optionTotals } from "@/lib/quote-calc";
import { sanitizeQuoteInput } from "@/lib/quote-sanitize";
import { quoteNumber, randomCode } from "@/lib/quote-code";
import type { Quote, QuoteInput, QuoteSummary } from "@/lib/quote-types";

// Truy cập bảng quotes — CHỈ phía máy chủ, bằng service role (bảng khoá RLS hoàn toàn).

export const quotesDb = () => createServiceClient().from("quotes");

export function dbError(message: string): string {
  return /relation .*quotes|schema cache|does not exist/i.test(message) ? "Chưa chạy SQL 0032_quotes.sql trên Supabase." : message;
}

/** Bản ghi DB → Quote (chuẩn hoá lại jsonb cho chắc) */
export function rowToQuote(row: Record<string, unknown>): Quote {
  const s = sanitizeQuoteInput(row);
  if (!s.ok) throw new Error(s.error);
  return {
    ...s.value,
    id: String(row.id),
    code: String(row.code),
    number: String(row.number ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function toSummary(q: Quote): QuoteSummary {
  const totals = q.options.map((o) => optionTotals(o, q.vat_rate).total).filter((t) => t > 0);
  return {
    id: q.id,
    code: q.code,
    number: q.number,
    status: q.status,
    customer: q.customer,
    program: q.program,
    updated_at: q.updated_at,
    optionCount: q.options.length,
    minTotal: totals.length ? Math.min(...totals) : null,
  };
}

/** Giờ Việt Nam hiện tại (để đánh số BG theo tháng VN) */
export function nowVN(): Date {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Tạo bản ghi mới với mã link ngẫu nhiên + số BG tiếp theo trong tháng */
export async function insertQuote(input: QuoteInput) {
  const now = nowVN();
  const prefix = quoteNumber(now, 0).slice(0, -3); // "BG-2611-"
  const { count } = await quotesDb().select("id", { count: "exact", head: true }).like("number", `${prefix}%`);
  const number = quoteNumber(now, (count ?? 0) + 1);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await quotesDb()
      .insert({ ...input, code: randomCode(), number })
      .select("*")
      .single();
    if (!error) return { quote: rowToQuote(data) };
    if (!/duplicate|unique/i.test(error.message)) return { error: dbError(error.message) };
  }
  return { error: "Không tạo được mã báo giá, thử lại." };
}

