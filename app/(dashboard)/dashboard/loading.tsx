import { Sk, SkStatGrid, SkCard, SkListItem } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Sk className="h-7 w-44" />
          <Sk className="h-4 w-32" />
        </div>
        <Sk className="h-9 w-24 rounded-xl" />
      </div>

      {/* 통계 카드 */}
      <SkStatGrid cols={4} />

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 할 일 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
          <Sk className="h-4 w-24 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => <SkListItem key={i} />)}
        </div>
        {/* 목표 진행 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
          <Sk className="h-4 w-20 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Sk className="h-3 w-full" />
              <Sk className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 위젯 행 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkCard key={i} />)}
      </div>
    </div>
  )
}
