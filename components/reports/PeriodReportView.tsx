'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { AnalysisData } from '@/app/actions/analysis'

type ChartPoint = { label: string; count: number }

type Props = {
  data: AnalysisData
  chartData: ChartPoint[]
  chartTooltipLabel?: (label: string) => string
  chartXInterval?: number
}

const GOAL_TYPE_KO: Record<string, string> = {
  yearly: '연간', monthly: '월간', weekly: '주간', custom: '커스텀',
}

const GOAL_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: '진행중', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  completed: { label: '달성', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  paused: { label: '일시중지', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  abandoned: { label: '포기', cls: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
}

function fmtMin(min: number): string {
  if (min === 0) return '—'
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

const CATEGORY_COLORS = ['#14B8A6', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6']

export default function PeriodReportView({ data, chartData, chartTooltipLabel, chartXInterval = 0 }: Props) {
  const totalTasks = data.tasks.length
  const doneTasks = data.tasks.filter((t) => t.status === 'done')
  const completionRate = totalTasks ? Math.round((doneTasks.length / totalTasks) * 100) : 0
  const totalTimeMin = data.timeEntries.reduce((s, e) => s + e.durationMin, 0)
  const routineDone = data.routineLogs.filter((l) => l.done).length

  const catMap: Record<string, { name: string; color: string; total: number; done: number }> = {}
  data.tasks.forEach((t) => {
    const key = t.categoryName ?? '미분류'
    if (!catMap[key]) catMap[key] = { name: key, color: t.categoryColor ?? '#9CA3AF', total: 0, done: 0 }
    catMap[key].total++
    if (t.status === 'done') catMap[key].done++
  })
  const catList = Object.values(catMap).sort((a, b) => b.total - a.total)

  const projMap: Record<string, number> = {}
  data.timeEntries.forEach((e) => {
    const key = e.projectTitle ?? '미분류'
    projMap[key] = (projMap[key] ?? 0) + e.durationMin
  })
  const projList = Object.entries(projMap)
    .map(([name, min]) => ({ name, min }))
    .sort((a, b) => b.min - a.min)

  const routineMap: Record<string, number> = {}
  data.routineLogs.filter((l) => l.done).forEach((l) => {
    routineMap[l.routineTitle] = (routineMap[l.routineTitle] ?? 0) + 1
  })
  const routineList = Object.entries(routineMap)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)

  const doneByDate: Record<string, typeof doneTasks> = {}
  doneTasks.forEach((t) => {
    if (!doneByDate[t.taskDate]) doneByDate[t.taskDate] = []
    doneByDate[t.taskDate].push(t)
  })
  const doneDateSorted = Object.keys(doneByDate).sort().reverse()

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="완료한 일" value={`${doneTasks.length}건`}
          sub={`전체 ${totalTasks}건 중 ${completionRate}%`}
          color={completionRate >= 70 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'} />
        <StatCard label="총 기록 시간" value={fmtMin(totalTimeMin)} sub={`${data.timeEntries.length}개 세션`}
          color="text-blue-600 dark:text-blue-400" />
        <StatCard label="루틴 달성" value={`${routineDone}회`} sub={`${routineList.length}개 루틴`}
          color="text-violet-600 dark:text-violet-400" />
        <StatCard label="목표" value={`${data.goals.filter((g) => g.status === 'active').length}개 진행`}
          sub={data.goals.filter((g) => g.status === 'completed').length ? `${data.goals.filter((g) => g.status === 'completed').length}개 달성` : undefined}
          color="text-amber-600 dark:text-amber-400" />
      </div>

      {/* 일별 완료 현황 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">일별 완료 현황</h2>
        {totalTasks === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">이 기간에 할 일이 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                interval={chartXInterval} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v}건`, '완료']}
                labelFormatter={(l) => chartTooltipLabel ? chartTooltipLabel(String(l)) : String(l)} />
              <Bar dataKey="count" fill="#14B8A6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 카테고리 + 프로젝트 시간 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 카테고리별 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">카테고리별 할 일</h2>
          {catList.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">데이터 없음</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={catList} dataKey="total" nameKey="name" cx="50%" cy="50%"
                    outerRadius={60} innerRadius={35} paddingAngle={3}>
                    {catList.map((c, i) => (
                      <Cell key={c.name} fill={c.color !== '#9CA3AF' ? c.color : CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}건`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {catList.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: c.color !== '#9CA3AF' ? c.color : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.done}/{c.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 프로젝트별 시간 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">프로젝트별 시간</h2>
          {projList.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">시간 기록 없음</div>
          ) : (
            <div className="space-y-3">
              {projList.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{p.name}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">{fmtMin(p.min)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${(p.min / projList[0].min) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 루틴 달성 */}
      {routineList.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">루틴 달성 현황</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {routineList.map((r) => (
              <div key={r.title} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{r.title}</p>
                <p className="text-xl font-black text-violet-600 dark:text-violet-400">{r.count}회</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 완료한 할 일 목록 */}
      {doneTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            완료한 할 일 <span className="text-gray-400 font-normal text-xs ml-1">{doneTasks.length}건</span>
          </h2>
          <div className="space-y-4">
            {doneDateSorted.map((date) => (
              <div key={date}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
                <div className="space-y-1">
                  {doneByDate[date].map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <svg className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{t.title}</span>
                      {t.categoryName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ backgroundColor: (t.categoryColor ?? '#9CA3AF') + '20', color: t.categoryColor ?? '#9CA3AF' }}>
                          {t.categoryName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 목표 현황 */}
      {data.goals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">목표 현황</h2>
          <div className="space-y-2">
            {data.goals.map((g) => {
              const s = GOAL_STATUS[g.status] ?? GOAL_STATUS.active
              return (
                <div key={g.id} className="flex items-center gap-2.5 py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${s.cls}`}>{s.label}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{GOAL_TYPE_KO[g.type] ?? g.type}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
