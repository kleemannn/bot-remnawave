import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <Screen>
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-36 w-full rounded-[28px]" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </Screen>
  );
}
