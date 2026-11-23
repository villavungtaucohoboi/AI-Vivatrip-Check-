import { NextRequest, NextResponse } from "next/server";
import { dbError, insertQuote, nowVN, quotesDb, rowToQuote, toSummary } from "@/lib/quote-db";
import { sanitizeQuoteInput } from "@/lib/quote-sanitize";
import { emptyQuoteInput, type QuoteInput } from "@/lib/quote-types";

export const dynamic = "force-dynamic";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

// Danh sách báo giá (200 bản mới nhất), lọc theo ?q= (số BG / khách / công ty / chương trình)
export async function GET(req: NextRequest) {
  const q = fold(req.nextUrl.searchParams.get("q")?.trim() ?? "");
  const { data, error } = await quotesDb().select("*").order("updated_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  let quotes = (data ?? []).map((r) => toSummary(rowToQuote(r)));
  if (q) quotes = quotes.filter((x) => fold([x.number, x.customer.name, x.customer.company, x.program.title].join(" ")).includes(q));
  return NextResponse.json({ quotes });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const today = nowVN().toISOString().slice(0, 10);
  let input: QuoteInput = emptyQuoteInput(today);
  if (body && typeof body === "object" && Object.keys(body).length) {
    const s = sanitizeQuoteInput(body);
    if (!s.ok) return NextResponse.json({ error: s.error }, { status: 400 });
    input = s.value;
  }
  const r = await insertQuote(input);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ quote: r.quote });
}
