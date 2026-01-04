import { Skeleton } from "@/components/ui/skeleton";

export default function TimelineLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}
