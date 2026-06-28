import { Sk, SkCardGrid, SkSearchBar } from '@/components/ui/Skeleton'

export default function IdeasLoading() {
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-32" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <SkSearchBar />
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-8 w-20 rounded-lg" />)}
      </div>
      <SkCardGrid count={9} cols={3} />
    </div>
  )
}
