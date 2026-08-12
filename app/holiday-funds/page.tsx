import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { HolidayFundsApp } from "@/components/holiday-funds/holiday-funds-app";
import type { HolidayFundSheet } from "@/lib/holiday-fund-types";

// Quyền Admin kiểm tra phía trình duyệt (xem lib/use-client-role.ts) để trang
// này không bị bắt buộc render động — cho phép cache ngắn, tải nhanh hơn.
export const revalidate = 15;

export default async function HolidayFundsPage() {
  const supabase = await createClient();
  const { data: sheets } = await supabase.from("holiday_fund_sheets").select("*").order("sort_order");

  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-6">
      <Header role="sale" />
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <HolidayFundsApp initialSheets={(sheets ?? []) as HolidayFundSheet[]} isAdmin={false} />
      </main>
      <BottomNav role="sale" />
    </div>
  );
}
