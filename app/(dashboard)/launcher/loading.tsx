import { Sk, SkSearchBar } from '@/components/ui/Skeleton'

export default function LauncherLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <Sk className="h-7 w-28" />
      <SkSearchBar />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
            <Sk className="h-8 w-8 rounded-xl" />
            <Sk className="h-3.5 w-20" />
            <Sk className="h-2.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
