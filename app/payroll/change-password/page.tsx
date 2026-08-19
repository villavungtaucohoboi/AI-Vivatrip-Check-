"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới nhập lại không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payroll/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Có lỗi xảy ra.");
        return;
      }

      router.replace("/payroll");
      router.refresh();
    } catch {
      setError("Có lỗi khi đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-white p-7">
        <div className="mb-5 text-center">
          <h1 className="text-[17px] font-bold text-ink">
            {isFirstLogin ? "Đặt mật khẩu mới" : "Đổi mật khẩu"}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {isFirstLogin
              ? "Đây là lần đăng nhập đầu tiên — bạn cần đặt mật khẩu riêng trước khi xem bảng lương."
              : "Nhập mật khẩu hiện tại và mật khẩu mới."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={isFirstLogin ? "Mật khẩu tạm được Admin cấp" : "Mật khẩu hiện tại"}
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu mật khẩu mới
          </Button>
        </form>
      </div>
    </main>
  );
}
