"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/route-guard";

function SaleLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quotes/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await res.json().catch(() => ({ error: "Có lỗi xảy ra, vui lòng thử lại." }));
    if (!res.ok || "error" in result) {
      setError(result.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      setLoading(false);
      return;
    }
    // Chỉ cho chuyển tới đường dẫn nội bộ (tránh link "next" dẫn ra trang ngoài)
    router.replace(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <div className="flex min-h-[70dvh] items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-white">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl text-ink">Soạn báo giá</h1>
          <p className="mt-1 text-sm text-ink-muted">Nhập mật khẩu chung của sale</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="rounded-xl bg-danger-light px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Vào soạn báo giá
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SaleLoginPage() {
  return (
    <Suspense>
      <SaleLoginForm />
    </Suspense>
  );
}
