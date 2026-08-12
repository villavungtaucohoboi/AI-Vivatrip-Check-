import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseHolidayFundText } from "@/lib/holiday-fund-parser";

export async function POST(req: NextRequest) {
  const { sheet_id, author_name, poster_token, raw_content, image_urls } = await req.json();

  if (!sheet_id || !author_name?.trim() || !poster_token || !raw_content?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: sheet, error: sheetError } = await supabase
    .from("holiday_fund_sheets")
    .select("default_year")
    .eq("id", sheet_id)
    .single();
  if (sheetError || !sheet) {
    return NextResponse.json({ error: "Không tìm thấy Sheet." }, { status: 404 });
  }

  const { data: post, error: postError } = await supabase
    .from("holiday_fund_posts")
    .insert({
      sheet_id,
      author_name: author_name.trim(),
      poster_token,
      raw_content: raw_content.trim(),
    })
    .select("id")
    .single();
  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 400 });
  }

  const parsed = parseHolidayFundText(raw_content, sheet.default_year);
  if (parsed.length > 0) {
    const { error: itemsError } = await supabase.from("holiday_fund_items").insert(
      parsed.map((p) => ({
        post_id: post.id,
        sheet_id,
        name: p.name,
        fund_date: p.fund_date_iso,
        price: p.price,
        raw_line: p.raw_line,
      }))
    );
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  if (Array.isArray(image_urls) && image_urls.length > 0) {
    const { error: imagesError } = await supabase.from("holiday_fund_images").insert(
      image_urls.map((image_url: string, sort_order: number) => ({ post_id: post.id, image_url, sort_order }))
    );
    if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 400 });
  }

  return NextResponse.json({ id: post.id });
}
