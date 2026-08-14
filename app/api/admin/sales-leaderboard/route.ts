import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const body: {
    entries: { rank: 1 | 2 | 3; name: string; amount: number }[];
    updated_by?: string;
  } = await req.json();

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: "Thiếu dữ liệu." }, { status: 400 });
  }

  const supabase = await createClient();

  for (const entry of body.entries) {
    const { error } = await supabase
      .from("sales_leaderboard")
      .update({
        name: entry.name.trim() || "Chưa cập nhật",
        amount: entry.amount ?? 0,
        updated_by: body.updated_by?.trim() || null,
      })
      .eq("rank", entry.rank);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath("/admin/leaderboard");
  return NextResponse.json({ ok: true });
}
