import { Sk } from '@/components/ui/Skeleton'

function SkFormRow() {
  return (
    <div className="space-y-2">
      <Sk className="h-3.5 w-24" />
      <Sk className="h-10 w-full rounded-xl" />
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Sk className="h-7 w-24" />
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
        <Sk className="h-5 w-32 mb-2" />
        <SkFormRow />
        <SkFormRow />
        <SkFormRow />
        <Sk className="h-10 w-28 rounded-xl mt-4" />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
        <Sk className="h-5 w-28 mb-2" />
        <SkFormRow />
        <SkFormRow />
        <Sk className="h-10 w-28 rounded-xl mt-4" />
      </div>
    </div>
  )
}
