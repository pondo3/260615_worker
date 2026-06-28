import { Sk, SkStatGrid } from '@/components/ui/Skeleton'

export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-32" />
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      <SkStatGrid cols={4} />
      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
          <Sk className="h-4 w-28" />
          <div className="h-56 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <Sk className="h-4 w-24" />
          <div className="h-40 w-40 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sk className="h-3 w-3 rounded-sm" />
                <Sk className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
