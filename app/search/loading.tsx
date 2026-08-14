import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="mb-3 h-14 w-full rounded-2xl" />
      <Skeleton className="mb-5 h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] sm:aspect-square" />
        ))}
      </div>
    </main>
  );
}
