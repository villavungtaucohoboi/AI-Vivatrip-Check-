import { QuoteEditor } from "@/components/quote/quote-editor";

export const metadata = { title: "Soạn báo giá · VivaTrip", robots: { index: false } };

export default async function QuoteEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteEditor id={id} />;
}
