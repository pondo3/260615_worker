export function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700/60 ${className}`} />
}

export function SkText({ lines = 3, last = '3/4' }: { lines?: number; last?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} className={`h-3 ${i === lines - 1 ? `w-[${last}]` : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <Sk className="h-4 w-32" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      <Sk className="h-3 w-full" />
      <Sk className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Sk className="h-3 w-20" />
        <Sk className="h-3 w-14" />
      </div>
    </div>
  )
}

export function SkStatCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
      <Sk className="h-3 w-20 mb-3" />
      <Sk className="h-8 w-14 mb-2" />
      <Sk className="h-2.5 w-28" />
    </div>
  )
}

export function SkListItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      <Sk className="h-4 w-4 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Sk className="h-3.5 w-48 max-w-full" />
        <Sk className="h-2.5 w-32" />
      </div>
      <Sk className="h-5 w-14 rounded-full flex-shrink-0" />
    </div>
  )
}

export function SkStatGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => <SkStatCard key={i} />)}
    </div>
  )
}

export function SkCardGrid({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => <SkCard key={i} />)}
    </div>
  )
}

export function SkList({ count = 7 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <SkListItem key={i} />)}
    </div>
  )
}

export function SkPageHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-1.5">
        <Sk className="h-6 w-32" />
        <Sk className="h-3.5 w-48" />
      </div>
      <Sk className="h-9 w-24 rounded-xl" />
    </div>
  )
}

export function SkSearchBar() {
  return <Sk className="h-10 w-full rounded-xl mb-4" />
}
