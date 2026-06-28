import { Sk, SkListItem } from '@/components/ui/Skeleton'

export default function ProcessesLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 왼쪽 패널 */}
      <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col p-4 gap-3">
        <Sk className="h-10 w-full rounded-xl" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="flex-1 h-8 rounded-lg" />)}
        </div>
        <div className="space-y-2 mt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <Sk className="h-4 w-4 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-3 w-32" />
                <Sk className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 가운데 패널 */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 p-6 gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <Sk className="h-7 w-48" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-9 w-9 rounded-lg" />)}
          </div>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-8 w-24 rounded-lg" />)}
        </div>
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                <Sk className="h-3 w-16" />
                <Sk className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Sk className="h-4 w-40" />
                  <Sk className="h-5 w-16 rounded-full" />
                </div>
                <Sk className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
