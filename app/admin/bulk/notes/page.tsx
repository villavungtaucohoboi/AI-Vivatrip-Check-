import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { NotesBulk, type NoteRow } from "@/components/admin/bulk/notes-bulk";

export const dynamic = "force-dynamic";

export default async function NotesBulkPage() {
  const supabase = await createClient();
  // select("*") để vẫn chạy được khi chưa có cột note_original
  const { data } = await supabase.from("products").select("*").order("type").order("area").order("product_name");

  const rows: NoteRow[] = (data ?? []).map((p) => ({
    id: p.id,
    code: p.product_code ?? "",
    name: p.product_name,
    area: p.area ?? "",
    type: p.type,
    note: p.note ?? "",
    original: p.note_original ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Rút gọn nội dung hàng loạt"
        subtitle="Chọn các căn → bấm Rút gọn → xem lại bên phải, sửa tay nếu cần → Lưu. Mỗi căn đều có nút Hoàn tác và Khôi phục bản gốc."
      />
      <NotesBulk initial={rows} />
    </main>
  );
}
