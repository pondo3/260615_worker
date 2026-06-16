'use client'

import { useRouter } from 'next/navigation'
import type { AnalysisData } from '@/app/actions/analysis'
import PeriodReportView from './PeriodReportView'

type Props = {
  data: AnalysisData
  year: number
  month: number
  fromDate: string
  toDate: string
}

export default function MonthlyReport({ data, year, month, fromDate, toDate }: Props) {
  const router = useRouter()

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    router.push(`/reports/monthly?month=${y}-${m}`)
  }

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isFuture = new Date(year, month - 1, 1) > now

  const daysInMonth = new Date(year, month, 0).getDate()
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return {
      label: String(d),
      count: data.tasks.filter((t) => t.taskDate === dateStr && t.status === 'done').length,
    }
  })

  if (isFuture) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg font-bold mb-2">{year}년 {month}월</p>
          <p className="text-sm">아직 시작되지 않은 달입니다.</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600">
            이전 달로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">월간 리포트</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {fromDate} ~ {toDate}
              {isCurrentMonth && <span className="ml-2 text-xs text-teal-600 dark:text-teal-400 font-semibold">(이번 달)</span>}
            </p>
          </div>
          {/* 월 네비게이터 */}
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[80px] text-center">
              {year}년 {month}월
            </span>
            <button onClick={() => navigate(1)} disabled={isCurrentMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl">
        <PeriodReportView
          data={data}
          chartData={chartData}
          chartXInterval={4}
          chartTooltipLabel={(l) => `${month}월 ${l}일`}
        />
      </div>
    </div>
  )
}
