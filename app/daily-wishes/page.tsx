import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { DailyWishesApp } from "@/components/daily-wishes/daily-wishes-app";

export default function DailyWishesPage() {
  return (
    <div className="min-h-dvh bg-paper pb-20 sm:pb-6">
      <Header role="sale" />
      <main className="mx-auto max-w-xl px-4 py-5 sm:px-6 sm:py-7">
        <DailyWishesApp />
      </main>
      <BottomNav role="sale" />
    </div>
  );
}
