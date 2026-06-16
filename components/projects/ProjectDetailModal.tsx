'use client'

import { useEffect } from 'react'

type Project = {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  startDate: string | null
  endDate: string | null
  color: string
}

type TaskStats = { total: number; done: number; inProgress: number; pending: number }

const TYPE_KO: Record<string, string> = { work: '업무', personal: '개인', study: '학습', other: '기타' }
const STATUS_KO: Record<string, string> = { planning: '계획 중', active: '진행 중', completed: '완료', paused: '중단' }
const STATUS_BADGE: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  paused:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const TYPE_BADGE: Record<string, string> = {
  work:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  personal: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  study:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  other:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function formatDate(iso: string | null) {
  if (!iso) return null
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

export default function ProjectDetailModal({ project, taskStats, onClose, onEdit }: {
  project: Project
  taskStats: TaskStats
  onClose: () => void
  onEdit: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pct = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0
  const remaining = daysLeft(project.endDate)
  const isDone = project.status === 'completed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: project.color }} />

        {/* 헤더 */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${TYPE_BADGE[project.type]}`}>
                {TYPE_KO[project.type]}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[project.status]}`}>
                {STATUS_KO[project.status]}
              </span>
              {remaining !== null && !isDone && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  remaining < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                  : remaining <= 7 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {remaining < 0 ? `${Math.abs(remaining)}일 초과` : remaining === 0 ? 'D-day' : `D-${remaining}`}
                </span>
              )}
            </div>
            <h2 className={`text-xl font-black leading-snug ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
              {project.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onEdit} className="p-2 rounded-xl text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors" title="수정">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="닫기">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메타 바 */}
        {(project.startDate || project.endDate) && (
          <div className="flex items-center gap-5 px-7 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(project.startDate) ?? '시작일 미설정'}
              {project.endDate && <> — {formatDate(project.endDate)}</>}
            </span>
          </div>
        )}

        {/* 할 일 통계 */}
        <div className="px-7 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">할 일 현황</span>
            <span className={`text-sm font-black ${pct >= 100 ? 'text-emerald-500' : pct >= 50 ? 'text-violet-500' : 'text-gray-400'}`}>
              {pct}%
            </span>
          </div>

          {taskStats.total > 0 ? (
            <>
              {/* 세그먼트 바 */}
              <div className="flex w-full h-2.5 rounded-full overflow-hidden gap-px mb-3 bg-gray-100 dark:bg-gray-800">
                {taskStats.done > 0 && (
                  <div className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
                )}
                {taskStats.inProgress > 0 && (
                  <div className="bg-blue-400 h-full transition-all"
                    style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />
                )}
                {taskStats.pending > 0 && (
                  <div className="bg-gray-200 dark:bg-gray-700 h-full transition-all"
                    style={{ width: `${(taskStats.pending / taskStats.total) * 100}%` }} />
                )}
              </div>
              {/* 범례 */}
              <div className="flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  완료 {taskStats.done}
                </span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  진행 중 {taskStats.inProgress}
                </span>
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                  대기 {taskStats.pending}
                </span>
                <span className="ml-auto text-gray-400">총 {taskStats.total}개</span>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">
              할 일 추가 시 <strong>프로젝트</strong> 필드에 이 프로젝트 이름을 입력하면 자동으로 연동됩니다.
            </p>
          )}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {project.description ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900 dark:[&_h1]:text-white
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-3 dark:[&_p]:text-gray-300
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul_li]:text-gray-700 dark:[&_ul_li]:text-gray-300
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_blockquote]:my-3
                [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                [&_strong]:font-semibold [&_em]:italic
                [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-3 [&_img]:shadow-sm
                [&_a]:text-violet-600 dark:[&_a]:text-violet-400 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: project.description }}
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
