"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Department, PayrollEmployee, SalaryScheme } from "@/lib/payroll-types";

export function EmployeesManager({
  initialEmployees,
  departments,
  schemes,
}: {
  initialEmployees: PayrollEmployee[];
  departments: Department[];
  schemes: SalaryScheme[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [deptId, setDeptId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ code: string; password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  function deptName(id: string | null) {
    return departments.find((d) => d.id === id)?.name ?? "—";
  }
  function schemeName(id: string | null) {
    return schemes.find((s) => s.id === id)?.name ?? "Chưa gán";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Vui lòng nhập Mã nhân viên và Họ tên.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payroll-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_code: code,
          full_name: name,
          position,
          department_id: deptId || undefined,
          salary_scheme_id: schemeId || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");

      setEmployees((prev) => [
        ...prev,
        {
          id: result.id,
          employee_code: code.toUpperCase(),
          full_name: name,
          position: position || null,
          department_id: deptId || null,
          salary_scheme_id: schemeId || null,
          must_change_password: true,
          is_active: true,
        },
      ]);
      setRevealedPassword({ code: code.toUpperCase(), password: result.tempPassword });
      setCode("");
      setName("");
      setPosition("");
      setDeptId("");
      setSchemeId("");
      toast.success("Đã tạo nhân viên");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(id: string, employeeCode: string) {
    setResettingId(id);
    try {
      const res = await fetch(`/api/admin/payroll-employees/${id}/reset-password`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Có lỗi xảy ra");
      setRevealedPassword({ code: employeeCode, password: result.tempPassword });
      toast.success("Đã tạo mật khẩu tạm mới");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setResettingId(null);
    }
  }

  async function handleAssignScheme(id: string, newSchemeId: string) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, salary_scheme_id: newSchemeId } : e)));
    await fetch(`/api/admin/payroll-employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salary_scheme_id: newSchemeId }),
    });
  }

  return (
    <div className="space-y-4">
      {revealedPassword && (
        <div className="rounded-2xl border border-teal/30 bg-teal-light p-4">
          <p className="text-[13px] font-bold text-teal-dark">
            Mật khẩu tạm cho {revealedPassword.code}: <span className="font-mono">{revealedPassword.password}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-teal-dark">
            Gửi cho nhân viên qua kênh riêng tư (Zalo/nhắn tay) — mật khẩu này chỉ hiện đúng 1 lần, không lưu lại được nữa.
            Nhân viên bắt buộc đổi mật khẩu ngay lần đăng nhập đầu.
          </p>
          <button onClick={() => setRevealedPassword(null)} className="mt-2 text-[11.5px] font-semibold text-teal-dark underline">
            Đã ghi lại, đóng thông báo này
          </button>
        </div>
      )}

      <Card className="p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="emp-code">Mã nhân viên</Label>
              <Input id="emp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: NV003" />
            </div>
            <div>
              <Label htmlFor="emp-name">Họ tên</Label>
              <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Trần Văn A" />
            </div>
          </div>
          <div>
            <Label htmlFor="emp-position">Chức vụ</Label>
            <Input id="emp-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="VD: Nhân viên Sale" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="emp-dept">Phòng ban</Label>
              <Select id="emp-dept" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">— Chọn —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="emp-scheme">Cơ chế lương</Label>
              <Select id="emp-scheme" value={schemeId} onChange={(e) => setSchemeId(e.target.value)}>
                <option value="">— Chọn —</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo nhân viên
          </Button>
        </form>
      </Card>

      <div className="divide-y divide-border rounded-2xl border border-border bg-white">
        {employees.map((emp) => (
          <div key={emp.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-bold text-ink">
                {emp.employee_code} — {emp.full_name}
                {emp.must_change_password && (
                  <span className="ml-2 rounded-full bg-sand-light px-2 py-0.5 text-[10px] font-semibold text-[#7A5F2B]">
                    Chưa đổi MK lần đầu
                  </span>
                )}
              </p>
              <p className="text-[12px] text-ink-muted">
                {emp.position ?? "—"} · {deptName(emp.department_id)} · {schemeName(emp.salary_scheme_id)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={emp.salary_scheme_id ?? ""}
                onChange={(e) => handleAssignScheme(emp.id, e.target.value)}
                className="w-40 text-[12.5px]"
              >
                <option value="">Chưa gán cơ chế</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <button
                onClick={() => handleResetPassword(emp.id, emp.employee_code)}
                disabled={resettingId === emp.id}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-ink-muted hover:bg-paper-dim"
              >
                {resettingId === emp.id ? "..." : "Reset MK"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
