"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

/**
 * Kiểm tra quyền Admin PHÍA TRÌNH DUYỆT thay vì đọc cookies() ngay trên
 * server — để trang /search và /products/[id] không bị Next.js coi là
 * "dynamic" (mất hết khả năng cache) chỉ vì phải biết ai đang xem là Admin
 * hay Sale. `initialRole` (mặc định "sale") vẫn hiện ngay lập tức, sau đó
 * nếu đúng là Admin thì tự cập nhật rất nhanh sau khi trang đã tải xong.
 */
export function useClientRole(initialRole: UserRole = "sale"): UserRole {
  const [role, setRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session")
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then((data) => {
        if (!cancelled && data.isAdmin) setRole("admin");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
