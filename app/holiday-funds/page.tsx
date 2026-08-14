import { createClient } from "@/lib/supabase/server";
import { HolidayFundsApp } from "@/components/holiday-funds/holiday-funds-app";
import type { HolidayFundSheet } from "@/lib/holiday-fund-types";

// Quyền Admin kiểm tra phía trình duyệt (xem lib/use-client-role.ts) để trang
// này không bị bắt buộc render động — cho phép cache ngắn, tải nhanh hơn.
export const revalidate = 15;

export default async function HolidayFundsPage() {
  const supabase = await createClient();
  const { data: sheets } = await supabase.from("holiday_fund_sheets").select("*").order("sort_order");

  return (
      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <HolidayFundsApp initialSheets={(sheets ?? []) as HolidayFundSheet[]} isAdmin={false} />
      </main>
  );
}
