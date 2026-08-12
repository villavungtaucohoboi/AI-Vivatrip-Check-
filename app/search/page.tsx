import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { SearchExperience } from "@/components/search-experience";

// Nội dung sản phẩm không đổi liên tục — cho phép cache 30 giây để trang tải
// gần như tức thì cho các lượt xem tiếp theo, thay vì luôn hỏi Supabase mới.
// Quyền Admin được kiểm tra riêng phía trình duyệt (xem lib/use-client-role.ts)
// nên KHÔNG dùng cookies()/isAdminSession() ở đây — giữ trang này "static-able".
export const revalidate = 30;

export default async function SearchPage() {
  const supabase = await createClient();

  const [{ data: areaRows }, { count }] = await Promise.all([
    supabase.rpc("get_distinct_areas"),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const areas = (areaRows ?? []).map((r: { area: string }) => r.area);

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role="sale" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <SearchExperience areas={areas} hasAnyProducts={(count ?? 0) > 0} isAdmin={false} />
      </main>
      <BottomNav role="sale" />
    </div>
  );
}
