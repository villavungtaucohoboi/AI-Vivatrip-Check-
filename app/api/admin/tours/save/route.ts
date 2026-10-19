import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cleanTour, colErr, saveDepartures } from "@/lib/tour-save";
import type { Tour, TourDeparture } from "@/lib/tour-types";

// Lưu 1 tour (tạo mới nếu chưa có id) + ngày khởi hành.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    tour?: Partial<Tour> & { id?: string };
    departures?: Partial<TourDeparture>[];
    mode?: "replace" | "merge";
  };
  const t = body.tour;
  if (!t) return NextResponse.json({ error: "Thiếu dữ liệu tour." }, { status: 400 });
  const row = cleanTour(t);
  if (!row.name) return NextResponse.json({ error: "Tour cần có tên." }, { status: 400 });

  const supabase = await createClient();
  let id = t.id;
  if (id) {
    const { error } = await supabase.from("tours").update(row).eq("id", id);
    if (error) return NextResponse.json({ error: colErr(error.message) }, { status: 500 });
  } else {
    const { data, error } = await supabase.from("tours").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? `Mã tour "${row.code}" đã có.` : colErr(error.message) }, { status: 500 });
    id = data.id as string;
  }
  let saved = 0;
  if (body.departures) {
    try {
      saved = await saveDepartures(supabase, id!, body.departures, body.mode ?? "replace");
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi lưu ngày khởi hành", id }, { status: 500 });
    }
  }
  revalidatePath("/tours");
  revalidatePath("/admin/tours");
  return NextResponse.json({ id, departures: saved });
}
