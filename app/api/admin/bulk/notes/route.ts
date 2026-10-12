import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Lưu nội dung (note) của nhiều căn 1 lần. Nếu gửi kèm `original` thì lưu luôn
// bản gốc vào cột note_original (để khôi phục sau). Chưa chạy migration 0025
// (chưa có cột note_original) thì vẫn lưu được note bình thường.
interface Item {
  id: string;
  note: string;
  original?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { items?: Item[] };
  const items = (body.items ?? []).filter((x) => x && typeof x.id === "string" && typeof x.note === "string");
  if (items.length === 0) return NextResponse.json({ error: "Không có thay đổi nào để lưu." }, { status: 400 });
  if (items.length > 500) return NextResponse.json({ error: "Tối đa 500 căn mỗi lần lưu." }, { status: 400 });

  const supabase = await createClient();
  const failed: { id: string; error: string }[] = [];
  let saved = 0;
  let originalSupported = true;

  for (let i = 0; i < items.length; i += 10) {
    await Promise.all(
      items.slice(i, i + 10).map(async (it) => {
        const fields: Record<string, unknown> = { note: it.note.trim() || null };
        if (originalSupported && it.original != null) fields.note_original = it.original;
        let { error } = await supabase.from("products").update(fields).eq("id", it.id);
        if (error && "note_original" in fields && /note_original/.test(error.message)) {
          originalSupported = false;
          ({ error } = await supabase.from("products").update({ note: fields.note }).eq("id", it.id));
        }
        if (error) failed.push({ id: it.id, error: error.message });
        else saved++;
      })
    );
  }

  revalidatePath("/admin/products");
  revalidateTag("products");
  return NextResponse.json({ saved, failed, originalSupported });
}
