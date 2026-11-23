import { QuoteDocument } from "@/components/quote/quote-document";
import { QuoteToolbar } from "@/components/quote/quote-toolbar";
import { SAMPLE_QUOTE, SAMPLE_QUOTE_LARGE } from "@/lib/quote-sample";

export const metadata = { title: "Báo giá mẫu – VivaTrip", robots: { index: false } };

// Xem thử bản báo giá gửi khách với dữ liệu mẫu (?lon=1: bản rất dài để thử in PDF)
export default async function QuoteSamplePage({ searchParams }: { searchParams: Promise<{ lon?: string }> }) {
  const big = (await searchParams).lon === "1";
  return (
    <main className="pb-8 print:pb-0">
      <QuoteToolbar salePhone={SAMPLE_QUOTE.sale_phone} fileName="Bao-gia-mau" />
      <div className="sm:px-4 print:px-0">
        <QuoteDocument quote={{ ...(big ? SAMPLE_QUOTE_LARGE : SAMPLE_QUOTE), number: "BG-2611-001", updated_at: new Date().toISOString() }} />
      </div>
    </main>
  );
}
