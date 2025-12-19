import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Search Card Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </div>
        </Card>

        {/* Cart Card Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="text-center py-12">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
            <Skeleton className="h-5 w-32 mx-auto" />
          </div>
        </Card>
      </div>
    </div>
  )
}
