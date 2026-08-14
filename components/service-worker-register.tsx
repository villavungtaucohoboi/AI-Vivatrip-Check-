"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Không chặn app nếu đăng ký thất bại (VD trình duyệt cũ không hỗ trợ)
    });
  }, []);

  return null;
}
