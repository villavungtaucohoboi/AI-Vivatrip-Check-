"use client";

import { Download, MessageCircle, Phone } from "lucide-react";

/** Nút cho khách trên trang báo giá — ẩn khi in. */
export function QuoteToolbar({ salePhone, fileName }: { salePhone: string; fileName: string }) {
  const digits = salePhone.replace(/\D/g, "");
  const btn = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold shadow-card";
  return (
    <div className="quote-toolbar sticky top-0 z-10 flex flex-wrap justify-center gap-2 bg-paper/90 px-4 py-2.5 backdrop-blur print:hidden">
      <button
        type="button"
        onClick={() => {
          const old = document.title;
          document.title = fileName;
          window.print();
          setTimeout(() => (document.title = old), 1000);
        }}
        className={`${btn} bg-teal text-white`}
      >
        <Download className="h-4 w-4" /> Tải PDF
      </button>
      {digits && (
        <>
          <a href={`tel:${digits}`} className={`${btn} bg-white text-ink`}>
            <Phone className="h-4 w-4" /> Gọi
          </a>
          <a href={`https://zalo.me/${digits}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-white text-ink`}>
            <MessageCircle className="h-4 w-4" /> Zalo
          </a>
        </>
      )}
    </div>
  );
}
