"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { ChatWidget } from "@/components/chat/chat-widget";

/**
 * Khung app nội bộ (menu trên, thanh dưới, chat). Trang báo giá gửi khách (/bg/...)
 * KHÔNG dùng khung này — khách không thấy menu nội bộ và trang không gọi API nội bộ.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/bg/") || pathname.startsWith("/lich-trinh/")) return <>{children}</>;
  return (
    <>
      <div className="contents print:hidden">
        <Header role="sale" />
      </div>
      {children}
      <div className="contents print:hidden">
        <BottomNav role="sale" />
        <ChatWidget />
      </div>
    </>
  );
}
