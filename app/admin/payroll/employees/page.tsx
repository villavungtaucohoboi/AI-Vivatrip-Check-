import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { EmployeesManager } from "@/components/admin/payroll/employees-manager";
import type { Department, PayrollEmployee, SalaryScheme } from "@/lib/payroll-types";

// Trang này luôn cần dữ liệu tươi (nhân viên/lương thay đổi liên tục) và
// dùng khóa service-role — không được để Next.js "dựng sẵn" lúc build.
export const dynamic = "force-dynamic";

export default async function AdminPayrollEmployeesPage() {
  const supabase = createServiceClient();
  const [{ data: employees }, { data: departments }, { data: schemes }] = await Promise.all([
    supabase.from("employees").select("*").order("employee_code"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("salary_schemes").select("*").eq("active", true).order("name"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/admin/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Quay lại Bảng lương
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Nhân viên</h1>
      <p className="mb-5 text-sm text-ink-muted">Tạo tài khoản (tự sinh mật khẩu tạm), gán cơ chế lương, reset mật khẩu khi quên.</p>

      <EmployeesManager
        initialEmployees={(employees ?? []) as PayrollEmployee[]}
        departments={(departments ?? []) as Department[]}
        schemes={(schemes ?? []) as SalaryScheme[]}
      />
    </main>
  );
}
