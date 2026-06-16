'use client'

import { useEffect } from 'react'
import type { CheckItem } from './ChecklistInput'

type Task = {
  id: number
  title: string
  description: string | null
  color: string
  taskDate: Date
  dueTime: string | null
  importance: string
  urgency: string
  status: string
  estimatedMinutes?: number | null
  checklist?: unknown
  projectName?: string | null
  goalName?: string | null
}

const importanceKo: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' }
const urgencyKo: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' }
const statusKo: Record<string, string> = {
  pending: '대기', in_progress: '진행 중', done: '완료', on_hold: '보류', cancelled: '취소',
}
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

function priorityLabel(t: Task) {
  if (t.status === 'done') return { text: '완료', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' }
  if (t.importance === 'high' && t.urgency === 'high') return { text: '최우선', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
  if (t.importance === 'high') return { text: '계획필요', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  if (t.urgency === 'high') return { text: '빠른처리', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' }
  return { text: '여유작업', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }
}

function parseChecklist(raw: unknown): CheckItem[] {
  if (!Array.isArray(raw)) return []
  return raw as CheckItem[]
}

export default function TaskDetailModal({ task, onClose, onEdit }: {
  task: Task
  onClose: () => void
  onEdit: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const prio = priorityLabel(task)
  const dateStr = new Date(task.taskDate).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
  const checklist = parseChecklist(task.checklist)
  const doneItems = checklist.filter((i) => i.done).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 색상 배너 */}
        <div
          className="h-1.5 flex-shrink-0 rounded-t-2xl"
          style={{ backgroundColor: task.color !== '#FFFFFF' ? task.color : '#3b82f6' }}
        />

        {/* 헤더 */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${prio.cls}`}>{prio.text}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_BADGE[task.status]}`}>
                {statusKo[task.status]}
              </span>
              {task.projectName && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium">
                  📁 {task.projectName}
                </span>
              )}
              {task.goalName && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                  🎯 {task.goalName}
                </span>
              )}
            </div>
            <h2 className={`text-xl font-bold leading-snug ${
              task.status === 'done'
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            }`}>
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onEdit}
              className="p-2 rounded-xl text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="수정">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="닫기">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메타데이터 바 */}
        <div className="flex items-center gap-4 px-7 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dateStr}
          </span>
          {task.dueTime && (
            <span className="flex items-center gap-1.5 text-orange-500 dark:text-orange-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" />
              </svg>
              마감 {task.dueTime}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" />
              </svg>
              예상 {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}시간${task.estimatedMinutes % 60 ? ` ${task.estimatedMinutes % 60}분` : ''}`
                : `${task.estimatedMinutes}분`}
            </span>
          )}
          <span>중요도 <strong className="text-gray-700 dark:text-gray-300">{importanceKo[task.importance]}</strong></span>
          <span>긴급도 <strong className="text-gray-700 dark:text-gray-300">{urgencyKo[task.urgency]}</strong></span>
        </div>

        {/* 체크리스트 */}
        {checklist.length > 0 && (
          <div className="px-7 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">체크리스트</span>
              <span className="text-xs text-gray-400 font-mono">{doneItems}/{checklist.length}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${(doneItems / checklist.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    item.done ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {item.done && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {task.description ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-gray-900 dark:[&_h1]:text-white
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-gray-900 dark:[&_h2]:text-white
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900 dark:[&_h3]:text-white
                [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-3 dark:[&_p]:text-gray-300
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul_li]:text-gray-700 dark:[&_ul_li]:text-gray-300
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol_li]:text-gray-700 dark:[&_ol_li]:text-gray-300
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 dark:[&_blockquote]:text-gray-400 [&_blockquote]:italic [&_blockquote]:my-3
                [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                [&_strong]:font-semibold [&_em]:italic
                [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-3 [&_img]:shadow-sm
                [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: task.description }}
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
