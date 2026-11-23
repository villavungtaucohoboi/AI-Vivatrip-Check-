import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { QuoteDocument } from "@/components/quote/quote-document";
import { QuoteToolbar } from "@/components/quote/quote-toolbar";
import { quotesDb, rowToQuote } from "@/lib/quote-db";
import type { Quote } from "@/lib/quote-types";

// TRANG BÁO GIÁ GỬI KHÁCH — baogia.vivatrip.vn/bg/<code>. Đọc đúng 1 báo giá theo mã (service role).
export const dynamic = "force-dynamic";

const load = cache(async (code: string): Promise<Quote | null> => {
  if (!/^[A-Z0-9]{4,16}$/.test(code)) return null;
  try {
    const { data, error } = await quotesDb().select("*").eq("code", code).maybeSingle();
    if (error || !data) return null;
    return rowToQuote(data);
  } catch {
    return null;
  }
});

const dm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const fileSafe = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const q = await load((await params).code);
  if (!q) return { title: "Báo giá – VivaTrip", robots: { index: false, follow: false } };
  const when = [q.program.date_from && dm(q.program.date_from), q.program.date_to && dm(q.program.date_to)].filter(Boolean).join("–");
  const title = `Báo giá ${q.program.title || "chương trình"} – VivaTrip`;
  const description = [when, q.program.pax_text, `${q.options.length} phương án`].filter(Boolean).join(" · ");
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: ["/brand/vivatrip-logo.png"] },
  };
}

export default async function QuotePublicPage({ params }: { params: Promise<{ code: string }> }) {
  const q = await load((await params).code);
  if (!q) notFound();
  const fileName = `Bao-gia-${q.number}-${fileSafe(q.customer.company || q.customer.name || q.program.title)}`.replace(/-$/, "");
  return (
    <main className="min-h-dvh bg-paper pb-8 print:bg-white print:pb-0">
      <QuoteToolbar salePhone={q.sale_phone} fileName={fileName} />
      <div className="sm:px-4 print:px-0">
        <QuoteDocument quote={q} />
      </div>
    </main>
  );
}
