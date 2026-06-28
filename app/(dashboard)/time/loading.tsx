import { Sk, SkList, SkStatGrid } from '@/components/ui/Skeleton'

export default function TimeLoading() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-28" />
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <SkStatGrid cols={4} />
      {/* 타임라인 영역 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <Sk className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Sk className="h-3 w-12 mt-1 flex-shrink-0" />
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-1.5">
                <Sk className="h-3.5 w-40" />
                <Sk className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <SkList count={4} />
    </div>
  )
}
