import { createClient } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/admin-auth";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { HolidayFundsApp } from "@/components/holiday-funds/holiday-funds-app";
import type { HolidayFundSheet } from "@/lib/holiday-fund-types";

export default async function HolidayFundsPage() {
  const supabase = await createClient();
  const [isAdmin, { data: sheets }] = await Promise.all([
    isAdminSession(),
    supabase.from("holiday_fund_sheets").select("*").order("sort_order"),
  ]);

  const role = isAdmin ? "admin" : "sale";

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-6">
      <Header role={role} />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <HolidayFundsApp initialSheets={(sheets ?? []) as HolidayFundSheet[]} isAdmin={isAdmin} />
      </main>
      <BottomNav role={role} />
    </div>
  );
}
