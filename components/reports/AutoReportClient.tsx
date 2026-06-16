'use client'

import { useRouter } from 'next/navigation'
import type { AnalysisData } from '@/app/actions/analysis'
import PeriodReportView from './PeriodReportView'
import { formatDate, parseDateParam, getWeekRange, getMonthRange, addWeeks, addMonths } from '@/lib/reportPeriods'

type PeriodType = 'week' | 'month'

type Props = {
  type: PeriodType
  data: AnalysisData
  anchorDate: string
  rangeStart: string
  rangeEnd: string
}

const WEEKDAY_KO = ['월', '화', '수', '목', '금', '토', '일']

export default function AutoReportClient({ type, data, anchorDate, rangeStart, rangeEnd }: Props) {
  const router = useRouter()
  const anchor = parseDateParam(anchorDate)

  function go(nextType: PeriodType, nextAnchor: Date) {
    router.push(`/reports/auto?type=${nextType}&date=${formatDate(nextAnchor)}`)
  }

  function navigate(delta: number) {
    go(type, type === 'month' ? addMonths(anchor, delta) : addWeeks(anchor, delta))
  }

  function switchType(nextType: PeriodType) {
    if (nextType === type) return
    go(nextType, new Date())
  }

  const now = new Date()
  const range = type === 'month' ? getMonthRange(anchor) : getWeekRange(anchor)
  const isCurrent = now >= range.start && now <= range.end
  const isFuture = range.start > now

  const periodLabel = type === 'month'
    ? `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
    : `${range.start.getMonth() + 1}월 ${range.start.getDate()}일 ~ ${range.end.getMonth() + 1}월 ${range.end.getDate()}일`

  let chartData: { label: string; count: number }[]
  let tooltipMap: Record<string, string> = {}

  if (type === 'month') {
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
    chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const dateStr = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { label: String(d), count: data.tasks.filter((t) => t.taskDate === dateStr && t.status === 'done').length }
    })
  } else {
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(range.start)
      d.setDate(range.start.getDate() + i)
      return d
    })
    chartData = weekDates.map((d, i) => ({
      label: WEEKDAY_KO[i],
      count: data.tasks.filter((t) => t.taskDate === formatDate(d) && t.status === 'done').length,
    }))
    weekDates.forEach((d, i) => {
      tooltipMap[WEEKDAY_KO[i]] = `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY_KO[i]})`
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">자동 리포트</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {rangeStart} ~ {rangeEnd}
              {isCurrent && (
                <span className="ml-2 text-xs text-teal-600 dark:text-teal-400 font-semibold">
                  ({type === 'month' ? '이번 달' : '이번 주'})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button onClick={() => switchType('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  type === 'week' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>
                주간
              </button>
              <button onClick={() => switchType('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  type === 'month' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>
                월간
              </button>
            </div>
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[140px] text-center">
              {periodLabel}
            </span>
            <button onClick={() => navigate(1)} disabled={isCurrent}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        {isFuture ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">아직 시작되지 않은 기간입니다.</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600">
              이전으로
            </button>
          </div>
        ) : (
          <PeriodReportView
            data={data}
            chartData={chartData}
            chartXInterval={type === 'month' ? 4 : 0}
            chartTooltipLabel={(l) => type === 'month' ? `${anchor.getMonth() + 1}월 ${l}일` : (tooltipMap[l] ?? l)}
          />
        )}
      </div>
    </div>
  )
}
