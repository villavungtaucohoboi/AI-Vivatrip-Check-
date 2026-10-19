import { createPublicClient } from "@/lib/supabase/public-client";
import { fetchTours } from "@/lib/tour-data";
import { todayVN } from "@/lib/tour-utils";
import { ToursExperience } from "@/components/tours/tours-experience";

export const revalidate = 30;
export const metadata = { title: "Tour nước ngoài · VivaTrip" };

export default async function ToursPage() {
  const today = todayVN();
  // Chỉ lấy ngày khởi hành SAU hôm nay → ngày đã qua tự ẩn
  const { tours, error } = await fetchTours(createPublicClient(), { fromDate: today });
  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
      <ToursExperience tours={tours} today={today} loadError={error} />
    </main>
  );
}
