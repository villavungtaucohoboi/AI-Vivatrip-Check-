import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.quote_text_vi?.trim() || !body.category) {
    return NextResponse.json({ error: "Vui lòng nhập câu tiếng Việt và category." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("motivation_quotes").insert({
    quote_text_original: body.quote_text_original?.trim() || null,
    quote_text_vi: body.quote_text_vi.trim(),
    author: body.author?.trim() || null,
    source_reference: body.source_reference?.trim() || null,
    category: body.category,
    is_verified: !!body.is_verified,
    is_active: body.is_active ?? true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}
