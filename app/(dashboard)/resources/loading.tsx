import { Sk, SkList, SkSearchBar } from '@/components/ui/Skeleton'

export default function ResourcesLoading() {
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-28" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <SkSearchBar />
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-8 w-20 rounded-lg" />)}
      </div>
      <SkList count={7} />
    </div>
  )
}
