type Props = {
  stage: 1 | 2 | 3 | 4
  title: string
  description: string
  features: string[]
  icon: React.ReactNode
}

const stageColor: Record<number, { bg: string; text: string; badge: string }> = {
  1: { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  2: { bg: 'bg-violet-600', text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  3: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  4: { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' },
}

export default function ComingSoon({ stage, title, description, features, icon }: Props) {
  const c = stageColor[stage]
  return (
    <div className="p-8">
      <div className={`relative ${c.bg} rounded-2xl px-8 py-8 mb-8 overflow-hidden`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                {stage}단계
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                개발 예정
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
            <p className="text-white/70 text-sm">{description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-white flex-shrink-0`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">주요 기능 예정</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">아래 기능들이 개발될 예정입니다</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className={`w-2 h-2 rounded-full ${c.bg} flex-shrink-0`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            이 기능은 <strong className={`${c.text} font-semibold`}>{stage}단계</strong> 개발 일정에 포함되어 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
