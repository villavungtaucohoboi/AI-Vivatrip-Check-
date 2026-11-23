import { NextRequest, NextResponse } from "next/server";
import { dbError, insertQuote, quotesDb, rowToQuote } from "@/lib/quote-db";

export const dynamic = "force-dynamic";

// Nhân bản: mã link + số BG mới, trạng thái nháp
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  const { data, error } = await quotesDb().select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: dbError(error.message) }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
  const { id: _id, code: _c, number: _n, created_at: _ca, updated_at: _ua, ...input } = rowToQuote(data);
  const r = await insertQuote({ ...input, status: "draft" });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ quote: r.quote });
}
