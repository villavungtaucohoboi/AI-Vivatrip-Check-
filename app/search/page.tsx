import { createClient } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin-auth";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { SearchExperience } from "@/components/search-experience";

export default async function SearchPage() {
  const supabase = await createClient();

  const [{ data: areaRows }, { count }, isAdmin] = await Promise.all([
    supabase.from("products").select("area"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    isAdminSession(),
  ]);

  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
  const role = isAdmin ? "admin" : "sale";

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role={role} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <SearchExperience areas={areas} hasAnyProducts={(count ?? 0) > 0} isAdmin={isAdmin} />
      </main>
      <BottomNav role={role} />
    </div>
  );
}
