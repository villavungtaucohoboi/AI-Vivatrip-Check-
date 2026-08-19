"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PayrollLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payroll/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Có lỗi xảy ra.");
        return;
      }

      if (result.mustChangePassword) {
        router.replace("/payroll/change-password?first=1");
      } else {
        router.replace(searchParams.get("next") || "/payroll");
      }
      router.refresh();
    } catch {
      setError("Có lỗi khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-white p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal text-lg font-bold text-white">
            V
          </div>
          <h1 className="text-[17px] font-bold text-ink">Bảng lương VivaTrip</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">Đăng nhập bằng mã nhân viên</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label htmlFor="employeeCode">Mã nhân viên</Label>
            <Input
              id="employeeCode"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="VD: NV001"
              autoCapitalize="characters"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu được Admin cấp"
              required
            />
          </div>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Đăng nhập
          </Button>
        </form>
      </div>
    </main>
  );
}
