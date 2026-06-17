import type { ReactNode } from 'react'

type Accent = 'violet' | 'purple' | 'blue' | 'indigo' | 'teal' | 'emerald' | 'amber' | 'rose' | 'orange' | 'cyan' | 'sky' | 'gray'

const ACCENT_MAP: Record<Accent, { bg: string; strip: string; glow: string; stat: string }> = {
  violet:  { bg: 'bg-violet-950',  strip: 'bg-violet-500',  glow: '#8B5CF6', stat: 'bg-violet-800/60 text-violet-200' },
  purple:  { bg: 'bg-purple-950',  strip: 'bg-purple-500',  glow: '#A855F7', stat: 'bg-purple-800/60 text-purple-200' },
  blue:    { bg: 'bg-blue-950',    strip: 'bg-blue-500',    glow: '#3B82F6', stat: 'bg-blue-800/60 text-blue-200' },
  indigo:  { bg: 'bg-indigo-950',  strip: 'bg-indigo-500',  glow: '#6366F1', stat: 'bg-indigo-800/60 text-indigo-200' },
  teal:    { bg: 'bg-teal-950',    strip: 'bg-teal-500',    glow: '#14B8A6', stat: 'bg-teal-800/60 text-teal-200' },
  emerald: { bg: 'bg-emerald-950', strip: 'bg-emerald-500', glow: '#10B981', stat: 'bg-emerald-800/60 text-emerald-200' },
  amber:   { bg: 'bg-amber-950',   strip: 'bg-amber-500',   glow: '#F59E0B', stat: 'bg-amber-800/60 text-amber-200' },
  rose:    { bg: 'bg-rose-950',    strip: 'bg-rose-500',    glow: '#F43F5E', stat: 'bg-rose-800/60 text-rose-200' },
  orange:  { bg: 'bg-orange-950',  strip: 'bg-orange-500',  glow: '#F97316', stat: 'bg-orange-800/60 text-orange-200' },
  cyan:    { bg: 'bg-cyan-950',    strip: 'bg-cyan-500',    glow: '#06B6D4', stat: 'bg-cyan-800/60 text-cyan-200' },
  sky:     { bg: 'bg-sky-950',     strip: 'bg-sky-500',     glow: '#0EA5E9', stat: 'bg-sky-800/60 text-sky-200' },
  gray:    { bg: 'bg-gray-900',    strip: 'bg-gray-600',    glow: '#6B7280', stat: 'bg-gray-700/60 text-gray-300' },
}

type Stat = { label: string; value: number | string; sub?: string }

type Props = {
  title: string
  description?: string
  accent?: Accent
  stats?: Stat[]
  actions?: ReactNode
  secondaryActions?: ReactNode
}

export default function PageHeader({ title, description, accent = 'gray', stats, actions, secondaryActions }: Props) {
  const a = ACCENT_MAP[accent]
  return (
    <div className={`relative ${a.bg} rounded-2xl mb-6 overflow-hidden`}>
      <div className={`h-1 ${a.strip}`} />
      <div
        className="absolute inset-0 opacity-15"
        style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${a.glow} 0%, transparent 60%)` }}
      />
      <div className="relative px-7 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white mb-0.5">{title}</h1>
            {description && <p className="text-sm text-gray-400">{description}</p>}
            {stats && stats.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {stats.map((s) => (
                  <div key={s.label} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${a.stat}`}>
                    <span className="opacity-75">{s.label}</span>
                    <span className="ml-1.5 font-black text-sm">{s.value}</span>
                    {s.sub && <span className="ml-1 opacity-60 text-[10px]">{s.sub}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {(actions || secondaryActions) && (
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              {actions && <div className="flex items-center gap-2">{actions}</div>}
              {secondaryActions && <div className="flex items-center gap-2">{secondaryActions}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { Accent }
