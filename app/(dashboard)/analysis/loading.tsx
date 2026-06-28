import { Sk, SkStatGrid } from '@/components/ui/Skeleton'

function SkChart({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3`}>
      <Sk className="h-4 w-32" />
      <div className={`${height} w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex items-end gap-2 px-4 pb-4`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t" style={{ height: `${30 + (i % 3) * 20 + ((i * 7) % 30)}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function AnalysisLoading() {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-16" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-9 w-20 rounded-lg" />)}
        </div>
      </div>
      <SkStatGrid cols={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkChart height="h-56" />
        <SkChart height="h-56" />
      </div>
      <SkChart height="h-40" />
    </div>
  )
}
