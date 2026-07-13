import { Skeleton } from "@/components/ui/skeleton";

// Shared fallback skeleton for any dashboard route that does not define its own
// loading.tsx (admin, calendar, teams, refer, etc.). Gives instant feedback on
// navigation instead of freezing on the previous page while the server renders.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
