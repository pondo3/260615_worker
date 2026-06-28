import { Sk, SkCardGrid, SkSearchBar, SkStatGrid } from '@/components/ui/Skeleton'

export default function RecordsLoading() {
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-28" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <SkStatGrid cols={3} />
      <SkSearchBar />
      <SkCardGrid count={6} cols={3} />
    </div>
  )
}
