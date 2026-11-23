import { NextRequest, NextResponse } from "next/server";
import { dbError, quotesDb, rowToQuote } from "@/lib/quote-db";
import { sanitizeQuoteInput } from "@/lib/quote-sanitize";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  const { data, error } = await quotesDb().select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  return NextResponse.json({ quote: rowToQuote(data) });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  const s = sanitizeQuoteInput(await req.json().catch(() => null));
  if (!s.ok) return NextResponse.json({ error: s.error }, { status: 400 });
  const { data, error } = await quotesDb()
    .update({ ...s.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  return NextResponse.json({ quote: rowToQuote(data) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  const { error } = await quotesDb().delete().eq("id", id);
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
