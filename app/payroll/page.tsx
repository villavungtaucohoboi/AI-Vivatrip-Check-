import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { getEmployeeIdFromSession } from "@/lib/payroll-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { PayslipView } from "@/components/payroll/payslip-view";

export const dynamic = "force-dynamic";
import { LogoutButton } from "@/components/payroll/logout-button";

export default async function PayrollPage() {
  const employeeId = await getEmployeeIdFromSession();

  if (!employeeId) {
    redirect("/payroll/login");
  }

  const supabase = createServiceClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, employee_code, full_name, position, must_change_password")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) {
    redirect("/payroll/login");
  }
  if (employee.must_change_password) {
    redirect("/payroll/change-password?first=1");
  }

  const { data: payslips } = await supabase
    .from("payslips")
    .select("*, payroll_periods!inner(month, year, status)")
    .eq("employee_id", employee.id)
    .in("payroll_periods.status", ["approved", "locked"])
    .order("created_at", { ascending: false });

  const latestPayslip = payslips?.[0] ?? null;

  let items: unknown[] = [];
  if (latestPayslip) {
    const { data } = await supabase
      .from("payslip_items")
      .select("*")
      .eq("payslip_id", latestPayslip.id)
      .order("sort_order");
    items = data ?? [];
  }

  return (
    <div className="min-h-dvh bg-paper pb-10">
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[13.5px] font-bold text-ink">{employee.full_name}</p>
            <p className="flex items-center gap-1 text-[11px] text-ink-muted">
              <ShieldCheck className="h-3 w-3" />
              {employee.employee_code} · Chỉ bạn xem được trang này
            </p>
          </div>
          <LogoutButton>
            <LogOut className="h-4 w-4" />
          </LogoutButton>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <PayslipView
          employeeName={employee.full_name}
          employeePosition={employee.position}
          payslip={latestPayslip}
          items={items}
        />
      </main>
    </div>
  );
}
