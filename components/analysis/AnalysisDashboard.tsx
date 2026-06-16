'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getAnalysisData, type AnalysisData } from '@/app/actions/analysis'

// ── 기간 정의 ─────────────────────────────────────────────────────────────────

type PeriodKey = 'week' | 'month' | 'last_month' | '7days' | '30days'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'last_month', label: '지난 달' },
  { key: '7days', label: '최근 7일' },
  { key: '30days', label: '최근 30일' },
]

function getPeriodDates(key: PeriodKey): { from: Date; to: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (key) {
    case 'week': {
      const from = new Date(today)
      const day = from.getDay()
      from.setDate(from.getDate() - (day === 0 ? 6 : day - 1))
      return { from, to: today }
    }
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from, to }
    }
    case '7days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from, to: today }
    }
    case '30days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { from, to: today }
    }
  }
}

// ── 날짜 유틸 ─────────────────────────────────────────────────────────────────

function dateRange(from: Date, to: Date): Date[] {
  const dates: Date[] = []
  const cur = new Date(from)
  while (cur <= to) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function dateLabel(d: Date, totalDays: number): string {
  if (totalDays <= 7) return `${d.getMonth() + 1}/${d.getDate()}(${['일','월','화','수','목','금','토'][d.getDay()]})`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function sameDay(isoStr: string, d: Date): boolean {
  const [y, m, day] = isoStr.split('-').map(Number)
  return y === d.getFullYear() && m === d.getMonth() + 1 && day === d.getDate()
}

function fmtMin(min: number): string {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

// ── 차트 커스텀 툴팁 ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      {label && <p className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 mb-0.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function TimeTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      {label && <p className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>}
      <p className="text-teal-600 dark:text-teal-400 font-bold">{fmtMin(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// ── 요약 카드 ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 빈 차트 플레이스홀더 ──────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
      {message}
    </div>
  )
}

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 로딩 오버레이 ─────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/10 dark:bg-black/20 backdrop-blur-[1px]">
      <div className="bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3 border border-gray-200 dark:border-gray-800">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">데이터 불러오는 중...</span>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

type Props = {
  initialData: AnalysisData
  initialPeriod: PeriodKey
  initialFrom: string
  initialTo: string
}

const CATEGORY_COLORS = ['#14B8A6', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6']

export default function AnalysisDashboard({ initialData, initialPeriod }: Props) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod)
  const [data, setData] = useState<AnalysisData>(initialData)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async (key: PeriodKey) => {
    setLoading(true)
    const { from, to } = getPeriodDates(key)
    const result = await getAnalysisData(
      from.toISOString().split('T')[0],
      to.toISOString().split('T')[0],
    )
    setData(result)
    setLoading(false)
  }, [])

  async function handlePeriod(key: PeriodKey) {
    setPeriod(key)
    await fetchData(key)
  }

  // ── 데이터 집계 ──────────────────────────────────────────────────────────────

  const { from, to } = getPeriodDates(period)
  const days = dateRange(from, to)
  const totalDays = days.length

  const totalTasks = data.tasks.length
  const doneTasks = data.tasks.filter((t) => t.status === 'done').length
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  const totalTimeMin = data.timeEntries.reduce((s, e) => s + e.durationMin, 0)
  const totalRoutineLogs = data.routineLogs.filter((l) => l.done).length

  const activeGoals = data.goals.filter((g) => g.status === 'active').length
  const completedGoals = data.goals.filter((g) => g.status === 'completed').length

  // 일별 할 일 차트
  const dailyTaskChart = days.map((d) => {
    const dayTasks = data.tasks.filter((t) => sameDay(t.taskDate, d))
    return {
      date: dateLabel(d, totalDays),
      완료: dayTasks.filter((t) => t.status === 'done').length,
      미완료: dayTasks.filter((t) => t.status !== 'done').length,
    }
  })

  // 카테고리별 파이 차트
  const categoryMap: Record<string, { name: string; color: string; total: number; done: number }> = {}
  data.tasks.forEach((t) => {
    const key = t.categoryName ?? '미분류'
    if (!categoryMap[key]) {
      categoryMap[key] = { name: key, color: t.categoryColor ?? '#9CA3AF', total: 0, done: 0 }
    }
    categoryMap[key].total++
    if (t.status === 'done') categoryMap[key].done++
  })
  const categoryChart = Object.values(categoryMap).sort((a, b) => b.total - a.total)

  // 일별 시간 차트
  const dailyTimeChart = days.map((d) => ({
    date: dateLabel(d, totalDays),
    분: data.timeEntries
      .filter((e) => sameDay(e.startedAt.split('T')[0], d))
      .reduce((s, e) => s + e.durationMin, 0),
  }))

  // 프로젝트별 시간
  const projectTimeMap: Record<string, number> = {}
  data.timeEntries.forEach((e) => {
    const key = e.projectTitle ?? '미분류'
    projectTimeMap[key] = (projectTimeMap[key] ?? 0) + e.durationMin
  })
  const projectTimeChart = Object.entries(projectTimeMap)
    .map(([name, min]) => ({ name, min }))
    .sort((a, b) => b.min - a.min)
    .slice(0, 8)

  // 루틴 별 기록
  const routineMap: Record<string, { title: string; count: number }> = {}
  data.routineLogs
    .filter((l) => l.done)
    .forEach((l) => {
      const key = l.routineTitle
      if (!routineMap[key]) routineMap[key] = { title: key, count: 0 }
      routineMap[key].count++
    })
  const routineChart = Object.values(routineMap).sort((a, b) => b.count - a.count)

  const xAxisTickCount = totalDays <= 7 ? undefined : Math.ceil(totalDays / 5)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {loading && <LoadingOverlay />}

      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">분석</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {from.toLocaleDateString('ko-KR')} ~ {to.toLocaleDateString('ko-KR')}
            </p>
          </div>
          {/* 기간 탭 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePeriod(p.key)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                } disabled:opacity-50`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-5xl">

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="할 일 완료율"
            value={`${completionRate}%`}
            sub={`${doneTasks}/${totalTasks}건 완료`}
            color={completionRate >= 70 ? 'text-teal-600 dark:text-teal-400' : completionRate >= 40 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}
          />
          <StatCard
            label="총 기록 시간"
            value={totalTimeMin >= 60 ? `${Math.floor(totalTimeMin / 60)}시간` : `${totalTimeMin}분`}
            sub={totalTimeMin >= 60 ? `${totalTimeMin % 60}분 포함` : undefined}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="루틴 달성"
            value={`${totalRoutineLogs}건`}
            sub={`${routineChart.length}개 루틴`}
            color="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            label="목표 현황"
            value={`${activeGoals}개 진행중`}
            sub={completedGoals ? `${completedGoals}개 달성` : undefined}
            color="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* 일별 할 일 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionHeader title="일별 할 일 현황" sub={`완료 ${doneTasks}건 / 전체 ${totalTasks}건`} />
          {totalTasks === 0 ? (
            <EmptyChart message="해당 기간에 할 일이 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyTaskChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={xAxisTickCount ? xAxisTickCount - 1 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="완료" stackId="a" fill="#14B8A6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="미완료" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 카테고리 분포 + 루틴 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 카테고리 파이 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <SectionHeader title="카테고리별 할 일" />
            {categoryChart.length === 0 ? (
              <EmptyChart message="데이터가 없습니다." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryChart}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {categoryChart.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color !== '#9CA3AF' ? entry.color : CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}건`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {categoryChart.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color !== '#9CA3AF' ? c.color : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{c.name}</span>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{c.done}/{c.total}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 루틴 성공 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <SectionHeader title="루틴 달성 현황" sub={`총 ${totalRoutineLogs}회 달성`} />
            {routineChart.length === 0 ? (
              <EmptyChart message="해당 기간에 루틴 기록이 없습니다." />
            ) : (
              <div className="space-y-3">
                {routineChart.map((r) => (
                  <div key={r.title}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{r.title}</span>
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex-shrink-0">{r.count}회</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-400 rounded-full"
                        style={{ width: `${Math.min((r.count / totalDays) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 일별 시간 기록 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionHeader title="일별 시간 기록" sub={`총 ${fmtMin(totalTimeMin)}`} />
          {data.timeEntries.length === 0 ? (
            <EmptyChart message="해당 기간에 시간 기록이 없습니다." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyTimeChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={xAxisTickCount ? xAxisTickCount - 1 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`} />
                <Tooltip content={<TimeTooltip />} />
                <Bar dataKey="분" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 프로젝트별 시간 */}
        {projectTimeChart.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <SectionHeader title="프로젝트별 시간" />
            <div className="space-y-3">
              {projectTimeChart.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{p.name}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">{fmtMin(p.min)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(p.min / projectTimeChart[0].min) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 목표 현황 */}
        {data.goals.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <SectionHeader title="목표 현황" />
            <div className="space-y-2">
              {data.goals.map((g) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  active: { label: '진행중', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
                  completed: { label: '달성', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                  paused: { label: '일시중지', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
                  abandoned: { label: '포기', cls: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
                }
                const typeMap: Record<string, string> = {
                  yearly: '연간', monthly: '월간', weekly: '주간', custom: '커스텀',
                }
                const s = statusMap[g.status] ?? statusMap.active
                return (
                  <div key={g.id} className="flex items-center gap-2.5 py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${s.cls}`}>{s.label}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{typeMap[g.type] ?? g.type}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
