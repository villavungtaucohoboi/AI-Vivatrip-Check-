import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { SearchExperience } from "@/components/search-experience";

export default async function SearchPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: areaRows }, { count }] = await Promise.all([
    supabase.from("products").select("area"),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const areas = Array.from(new Set((areaRows ?? []).map((r) => r.area))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-0">
      <Header role={profile?.role ?? "sale"} name={profile?.name} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <SearchExperience areas={areas} hasAnyProducts={(count ?? 0) > 0} isAdmin={isAdmin} />
      </main>
      <BottomNav role={profile?.role ?? "sale"} />
    </div>
  );
}
