import { Sk, SkList, SkSearchBar, SkStatGrid } from '@/components/ui/Skeleton'

export default function TestsLoading() {
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-32" />
        <Sk className="h-9 w-28 rounded-xl" />
      </div>
      <SkStatGrid cols={4} />
      <SkSearchBar />
      <SkList count={7} />
    </div>
  )
}
