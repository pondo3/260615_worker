'use client'

import { useEffect } from 'react'

type Goal = {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  startDate: string
  endDate: string | null
  color: string
}

type Progress = { total: number; done: number }

const TYPE_KO: Record<string, string> = { yearly: '연간', monthly: '월간', weekly: '주간', custom: '기타' }
const STATUS_KO: Record<string, string> = { active: '진행 중', completed: '완료', paused: '일시 중단', abandoned: '중단' }
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  abandoned: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const TYPE_BADGE: Record<string, string> = {
  yearly: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  monthly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  weekly: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  custom: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function daysLeft(endIso: string | null) {
  if (!endIso) return null
  const end = new Date(endIso)
  end.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GoalDetailModal({ goal, progress, onClose, onEdit }: {
  goal: Goal
  progress: Progress
  onClose: () => void
  onEdit: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const remaining = daysLeft(goal.endDate)
  const isDone = goal.status === 'completed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 컬러 스트립 */}
        <div className="h-1.5 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: goal.color }} />

        {/* 헤더 */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${TYPE_BADGE[goal.type]}`}>
                {TYPE_KO[goal.type]}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[goal.status]}`}>
                {STATUS_KO[goal.status]}
              </span>
              {remaining !== null && !isDone && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  remaining < 0
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                    : remaining <= 7
                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {remaining < 0 ? `${Math.abs(remaining)}일 초과` : remaining === 0 ? 'D-day' : `D-${remaining}`}
                </span>
              )}
            </div>
            <h2 className={`text-xl font-black leading-snug ${
              isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
            }`}>
              {goal.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onEdit}
              className="p-2 rounded-xl text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="수정">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="닫기">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메타 바 */}
        <div className="flex items-center gap-5 px-7 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-wrap flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(goal.startDate)}
            {goal.endDate && <> — {formatDate(goal.endDate)}</>}
          </span>
        </div>

        {/* 진행률 섹션 */}
        <div className="px-7 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">달성률</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {progress.total > 0 ? `할 일 ${progress.done}/${progress.total} 완료` : '연결된 할 일 없음'}
              </span>
              <span className={`text-sm font-black ${pct >= 100 ? 'text-emerald-500' : pct >= 50 ? 'text-blue-500' : 'text-gray-400'}`}>
                {pct}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: goal.color }}
            />
          </div>
          {progress.total === 0 && (
            <p className="text-[11px] text-gray-400 mt-2">
              할 일 추가 시 <strong>목표</strong> 필드에 이 목표 제목을 입력하면 자동으로 연동됩니다.
            </p>
          )}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {goal.description ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900 dark:[&_h1]:text-white
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-gray-900 dark:[&_h2]:text-white
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900 dark:[&_h3]:text-white
                [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-3 dark:[&_p]:text-gray-300
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul_li]:text-gray-700 dark:[&_ul_li]:text-gray-300
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol_li]:text-gray-700 dark:[&_ol_li]:text-gray-300
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-3
                [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                [&_strong]:font-semibold [&_em]:italic
                [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-3 [&_img]:shadow-sm
                [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: goal.description }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">내용이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
