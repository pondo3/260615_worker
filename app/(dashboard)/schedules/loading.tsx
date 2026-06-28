import { Sk, SkList, SkSearchBar } from '@/components/ui/Skeleton'

export default function SchedulesLoading() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-28" />
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      {/* 달력/주간 헤더 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <Sk className="h-5 w-32" />
          <div className="flex gap-1">
            <Sk className="h-8 w-8 rounded-lg" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Sk key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
      <SkSearchBar />
      <SkList count={5} />
    </div>
  )
}
