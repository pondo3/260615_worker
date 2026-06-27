'use client'

import { useState, useEffect } from 'react'
import { getExecutionHistory } from '@/app/actions/processes'

type Execution = Awaited<ReturnType<typeof getExecutionHistory>>[number]

function fmt(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function duration(start: Date | string, end: Date | string | null) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}분`
  return `${Math.floor(min / 60)}시간 ${min % 60}분`
}

export default function ExecutionHistoryModal({
  processId,
  processTitle,
  onClose,
}: {
  processId: number
  processTitle: string
  onClose: () => void
}) {
  const [history, setHistory] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExecutionHistory(processId).then((data) => {
      setHistory(data)
      setLoading(false)
    })
  }, [processId])

  const STATUS_LABEL: Record<string, string> = { in_progress: '진행 중', completed: '완료', cancelled: '취소' }
  const STATUS_COLOR: Record<string, string> = {
    in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">실행 이력</h2>
            <p className="text-xs text-gray-400 mt-0.5">{processTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500 gap-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">아직 실행 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {history.map((exec, idx) => {
                const completedSteps = exec.stepExecutions.filter((s) => s.status === 'completed').length
                const totalSteps = exec.stepExecutions.length
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
                const dur = duration(exec.startedAt, exec.completedAt)

                return (
                  <div key={exec.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{history.length - idx}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[exec.status] ?? STATUS_COLOR.cancelled}`}>
                          {STATUS_LABEL[exec.status] ?? exec.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">{fmt(exec.startedAt)}</span>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${exec.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {completedSteps}/{totalSteps} ({pct}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-gray-400">
                      {dur && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {dur}
                        </span>
                      )}
                      {exec.completedAt && (
                        <span>완료: {fmt(exec.completedAt)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
