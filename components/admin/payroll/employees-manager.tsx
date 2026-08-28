"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  const [baseSalary, setBaseSalary] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [joinDate, setJoinDate] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ code: string; password: string } | null>(null);

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
          base_salary: baseSalary,
          default_allowance: allowance,
          default_insurance: insurance,
          join_date: joinDate || undefined,
          date_of_birth: dob || undefined,
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
          base_salary: baseSalary,
          default_allowance: allowance,
          default_insurance: insurance,
          join_date: joinDate || null,
          date_of_birth: dob || null,
        },
      ]);
      setRevealedPassword({ code: code.toUpperCase(), password: result.tempPassword });
      setCode("");
      setName("");
      setPosition("");
      setDeptId("");
      setSchemeId("");
      setBaseSalary(0);
      setAllowance(0);
      setInsurance(0);
      setJoinDate("");
      setDob("");
      toast.success("Đã tạo nhân viên");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
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

  function handleEmployeeSaved(id: string, patch: Partial<PayrollEmployee>) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function handleEmployeeDeleted(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-4">
      {revealedPassword && (
        <div className="rounded-2xl border border-teal/30 bg-teal-light p-4">
          <p className="text-[13px] font-bold text-teal-dark">
            Mật khẩu tạm cho {revealedPassword.code}: <span className="font-mono">{revealedPassword.password}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-teal-dark">
            Gửi cho nhân viên qua kênh riêng tư — mật khẩu này chỉ hiện đúng 1 lần. Nhân viên bắt buộc đổi mật khẩu ngay lần đăng nhập đầu.
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="emp-join-date">Ngày vào làm</Label>
              <Input id="emp-join-date" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="emp-dob">Ngày sinh</Label>
              <Input id="emp-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MoneyInput label="Lương cố định" value={baseSalary} onChange={setBaseSalary} />
            <MoneyInput label="Phụ cấp" value={allowance} onChange={setAllowance} />
            <MoneyInput label="Bảo hiểm" value={insurance} onChange={setInsurance} deduct />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo nhân viên
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {employees.map((emp) => (
          <EmployeeRow
            key={emp.id}
            emp={emp}
            departments={departments}
            schemes={schemes}
            deptName={deptName}
            schemeName={schemeName}
            onAssignScheme={handleAssignScheme}
            onSaved={handleEmployeeSaved}
            onDeleted={handleEmployeeDeleted}
          />
        ))}
      </div>
    </div>
  );
}

function EmployeeRow({
  emp,
  schemes,
  deptName,
  schemeName,
  onAssignScheme,
  onSaved,
  onDeleted,
}: {
  emp: PayrollEmployee;
  departments: Department[];
  schemes: SalaryScheme[];
  deptName: (id: string | null) => string;
  schemeName: (id: string | null) => string;
  onAssignScheme: (id: string, schemeId: string) => void;
  onSaved: (id: string, patch: Partial<PayrollEmployee>) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    base_salary: emp.base_salary,
    default_allowance: emp.default_allowance,
    default_insurance: emp.default_insurance,
    join_date: emp.join_date ?? "",
    date_of_birth: emp.date_of_birth ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState<"soft" | "hard" | null>(null);

  const isDirty =
    form.base_salary !== emp.base_salary ||
    form.default_allowance !== emp.default_allowance ||
    form.default_insurance !== emp.default_insurance ||
    form.join_date !== (emp.join_date ?? "") ||
    form.date_of_birth !== (emp.date_of_birth ?? "");

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/payroll-employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_salary: form.base_salary,
        default_allowance: form.default_allowance,
        default_insurance: form.default_insurance,
        join_date: form.join_date || null,
        date_of_birth: form.date_of_birth || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Không thể lưu — thử lại nhé.");
      return;
    }
    onSaved(emp.id, {
      base_salary: form.base_salary,
      default_allowance: form.default_allowance,
      default_insurance: form.default_insurance,
      join_date: form.join_date || null,
      date_of_birth: form.date_of_birth || null,
    });
    toast.success("Đã lưu thay đổi cho " + emp.full_name);
  }

  async function handleResetPassword() {
    setResettingId(true);
    const res = await fetch(`/api/admin/payroll-employees/${emp.id}/reset-password`, { method: "POST" });
    const result = await res.json();
    setResettingId(false);
    if (!res.ok) {
      toast.error(result.error ?? "Có lỗi xảy ra");
      return;
    }
    toast.success(`Mật khẩu tạm mới cho ${emp.employee_code}: ${result.tempPassword}`, { duration: 10000 });
  }

  async function handleDelete(mode: "soft" | "hard") {
    setDeleting(mode);
    const res = await fetch(`/api/admin/payroll-employees/${emp.id}?mode=${mode}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      toast.error("Không thể xoá — thử lại nhé.");
      return;
    }
    toast.success(
      mode === "hard"
        ? `Đã xoá ${emp.full_name} VÀ toàn bộ lịch sử lương`
        : `Đã vô hiệu hoá ${emp.full_name} — lịch sử lương vẫn được giữ lại`
    );
    onDeleted(emp.id);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13.5px] font-bold text-ink">
            {emp.employee_code} — {emp.full_name}
            {emp.must_change_password && (
              <span className="ml-2 rounded-full bg-sand-light px-2 py-0.5 text-[10px] font-semibold text-sand-dark">
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
            onChange={(e) => onAssignScheme(emp.id, e.target.value)}
            className="w-40 text-[12.5px]"
          >
            <option value="">Chưa gán cơ chế</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <button
            onClick={handleResetPassword}
            disabled={resettingId}
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-ink-muted hover:bg-paper-dim"
          >
            {resettingId ? "..." : "Reset MK"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-lg border border-border p-2 text-ink-muted hover:bg-danger-light hover:text-danger"
            title="Xoá nhân viên"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-[10.5px]">Ngày vào làm</Label>
          <input
            type="date"
            value={form.join_date}
            onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))}
            className="h-8 w-full rounded-lg border border-border bg-white px-2 text-[12px]"
          />
        </div>
        <div>
          <Label className="text-[10.5px]">Ngày sinh</Label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
            className="h-8 w-full rounded-lg border border-border bg-white px-2 text-[12px]"
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-paper-dim p-2.5">
        <MoneyInput
          compact
          label="Lương cố định"
          value={form.base_salary}
          onChange={(v) => setForm((f) => ({ ...f, base_salary: v }))}
        />
        <MoneyInput
          compact
          label="Phụ cấp"
          value={form.default_allowance}
          onChange={(v) => setForm((f) => ({ ...f, default_allowance: v }))}
        />
        <MoneyInput
          compact
          label="Bảo hiểm"
          value={form.default_insurance}
          onChange={(v) => setForm((f) => ({ ...f, default_insurance: v }))}
          deduct
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        className={`mt-2.5 w-full rounded-lg py-2 text-[12.5px] font-bold transition ${
          isDirty ? "bg-teal text-white hover:bg-teal-dark" : "bg-paper-dim text-ink-muted"
        }`}
      >
        {saving ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Đã lưu"}
      </button>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-5">
          <div className="w-full max-w-[380px] rounded-2xl bg-white p-5">
            <p className="text-[14.5px] font-bold text-ink">Xoá {emp.full_name}?</p>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">
              Chọn 1 trong 2 cách — không thể hoàn tác sau khi xác nhận.
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => handleDelete("soft")}
                disabled={deleting !== null}
                className="w-full rounded-xl border border-border p-3 text-left hover:bg-paper-dim"
              >
                <p className="text-[13px] font-bold text-ink">
                  {deleting === "soft" ? "Đang xử lý..." : "Vô hiệu hoá, GIỮ LẠI lịch sử lương"}
                </p>
                <p className="text-[11.5px] text-ink-muted">Không đăng nhập được nữa, nhưng phiếu lương cũ vẫn còn nguyên.</p>
              </button>
              <button
                onClick={() => handleDelete("hard")}
                disabled={deleting !== null}
                className="w-full rounded-xl border border-danger/30 bg-danger-light p-3 text-left hover:bg-danger-light/70"
              >
                <p className="text-[13px] font-bold text-danger">
                  {deleting === "hard" ? "Đang xử lý..." : "Xoá hẳn, XOÁ LUÔN toàn bộ lịch sử lương"}
                </p>
                <p className="text-[11.5px] text-danger/80">Mất vĩnh viễn mọi phiếu lương đã tính của người này.</p>
              </button>
            </div>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting !== null}
              className="mt-3 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-ink-muted hover:bg-paper-dim"
            >
              Huỷ, không xoá
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  deduct,
  compact,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  deduct?: boolean;
  compact?: boolean;
}) {
  const [display, setDisplay] = useState(value ? value.toLocaleString("vi-VN") : "");

  return (
    <div>
      <Label className={compact ? "text-[10.5px]" : undefined}>{label}</Label>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          const num = Number(digits) || 0;
          setDisplay(digits ? num.toLocaleString("vi-VN") : "");
          onChange(deduct ? Math.abs(num) : num);
        }}
        placeholder="0"
        className={`w-full rounded-lg border border-border bg-white px-2.5 text-right font-semibold ${
          compact ? "h-8 text-[12px]" : "h-10 text-[13px]"
        } ${deduct ? "text-danger" : "text-ink"}`}
      />
    </div>
  );
}
