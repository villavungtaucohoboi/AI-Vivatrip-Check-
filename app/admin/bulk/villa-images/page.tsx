import { createClient } from "@/lib/supabase/server";
import { BulkPageHeader } from "@/components/admin/bulk/bulk-ui";
import { VillaImagesBulk, type VillaImgRow } from "@/components/admin/bulk/villa-images-bulk";

export const dynamic = "force-dynamic";

export default async function VillaImagesBulkPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: imgs }] = await Promise.all([
    supabase.from("products").select("id, product_code, product_name, area, type").order("area").order("product_name"),
    supabase.from("product_images").select("product_id, image_url, sort_order").order("sort_order"),
  ]);
  const byP = new Map<string, string[]>();
  for (const i of (imgs ?? []) as { product_id: string; image_url: string }[]) byP.set(i.product_id, [...(byP.get(i.product_id) ?? []), i.image_url]);

  const rows: VillaImgRow[] = ((products ?? []) as { id: string; product_code: string | null; product_name: string; area: string | null; type: string }[]).map((p) => ({
    id: p.id,
    code: p.product_code ?? "",
    name: p.product_name,
    area: p.area ?? "",
    type: p.type,
    images: byP.get(p.id) ?? [],
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <BulkPageHeader
        title="Up ảnh hàng loạt (kho ảnh R2)"
        subtitle="Chọn 1 thư mục lớn chứa nhiều thư mục con — mỗi thư mục con là ảnh của 1 căn (đặt tên theo mã hoặc tên căn). Web tự nén 2 cỡ, tự ghép đúng căn, up thẳng lên kho ảnh Cloudflare R2."
      />
      <VillaImagesBulk initial={rows} />
    </main>
  );
}
