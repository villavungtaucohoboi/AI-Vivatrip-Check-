import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin-auth";
import { parseHolidayFundText } from "@/lib/holiday-fund-parser";

async function canModify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  posterToken: string | undefined
): Promise<boolean> {
  if (await isAdminSession()) return true;
  if (!posterToken) return false;

  const { data } = await supabase.from("holiday_fund_posts").select("poster_token").eq("id", postId).single();
  return data?.poster_token === posterToken;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { raw_content, poster_token, image_urls } = await req.json();

  if (!raw_content?.trim()) {
    return NextResponse.json({ error: "Nội dung không được để trống." }, { status: 400 });
  }

  const supabase = await createClient();

  if (!(await canModify(supabase, id, poster_token))) {
    return NextResponse.json({ error: "Bạn chỉ có thể sửa bài của chính mình." }, { status: 403 });
  }

  const { data: post, error: fetchError } = await supabase
    .from("holiday_fund_posts")
    .select("sheet_id, holiday_fund_sheets(default_year)")
    .eq("id", id)
    .single();
  if (fetchError || !post) {
    return NextResponse.json({ error: "Không tìm thấy bài đăng." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("holiday_fund_posts")
    .update({ raw_content: raw_content.trim() })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Xóa item cũ, chạy lại parser, thêm item mới — đơn giản & luôn đồng bộ đúng với raw_content
  await supabase.from("holiday_fund_items").delete().eq("post_id", id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetInfo = post.holiday_fund_sheets as any;
  const defaultYear = sheetInfo?.default_year ?? new Date().getFullYear();
  const parsed = parseHolidayFundText(raw_content, defaultYear);
  if (parsed.length > 0) {
    const { error: itemsError } = await supabase.from("holiday_fund_items").insert(
      parsed.map((p) => ({
        post_id: id,
        sheet_id: post.sheet_id,
        name: p.name,
        fund_date: p.fund_date_iso,
        price: p.price,
        raw_line: p.raw_line,
      }))
    );
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  if (Array.isArray(image_urls)) {
    await supabase.from("holiday_fund_images").delete().eq("post_id", id);
    if (image_urls.length > 0) {
      await supabase.from("holiday_fund_images").insert(
        image_urls.map((image_url: string, sort_order: number) => ({ post_id: id, image_url, sort_order }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posterToken = req.nextUrl.searchParams.get("poster_token") ?? undefined;

  const supabase = await createClient();

  if (!(await canModify(supabase, id, posterToken))) {
    return NextResponse.json({ error: "Bạn chỉ có thể xóa bài của chính mình." }, { status: 403 });
  }

  const { error } = await supabase.from("holiday_fund_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
