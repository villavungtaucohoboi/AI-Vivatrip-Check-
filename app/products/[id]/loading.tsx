import { Skeleton } from "@/components/ui/skeleton";

// Hiện NGAY khi bấm vào sản phẩm (trong lúc máy chủ lấy dữ liệu) → không còn cảm giác "đơ" 1–2 giây
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="mb-4 h-5 w-48 rounded-lg" />
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
    </main>
  );
}
