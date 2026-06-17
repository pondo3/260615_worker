type Filter = { key: string; label: string }

type Props = {
  filters: Filter[]
  active: string
  onChange: (key: string) => void
  counts?: Record<string, number>
  highlightKeys?: Record<string, string>
}

export default function FilterTabs({ filters, active, onChange, counts, highlightKeys = {} }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map(({ key, label }) => {
        const count = counts?.[key]
        const isActive = active === key
        const highlightCls = !isActive ? (highlightKeys[key] ?? '') : ''
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900'
                  : highlightCls || 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
