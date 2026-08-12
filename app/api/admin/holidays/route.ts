import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { holiday_date, holiday_name }: { holiday_date: string; holiday_name: string } = await req.json();
  const supabase = await createClient();

  const { error } = await supabase.from("holidays").insert({ holiday_date, holiday_name });
  if (error) {
    const message = error.message.includes("holidays_holiday_date_key")
      ? "Ngày này đã có trong danh sách ngày lễ."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  revalidatePath("/admin/holidays");
  revalidateTag("holidays");
  return NextResponse.json({ ok: true });
}
