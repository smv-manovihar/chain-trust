import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4 sm:p-6 rounded-2xl border bg-muted/20 space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-full min-h-[220px] flex flex-col gap-4 p-2">
      <div className="flex-1 flex items-end gap-2 px-2">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-sm" 
            style={{ height: `${Math.random() * 60 + 20}%` }} 
          />
        ))}
      </div>
      <div className="flex justify-between px-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex border-b pb-2">
        <Skeleton className="h-4 w-24 mr-auto" />
        <Skeleton className="h-4 w-16" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function GeoSkeleton() {
  return (
    <div className="w-full space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
