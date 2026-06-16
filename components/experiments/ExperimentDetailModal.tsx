'use client'

import { useEffect, useState, useTransition } from 'react'
import { addExperimentLog } from '@/app/actions/experiments'
import { useRouter } from 'next/navigation'

type Log = {
  id: number
  logType: string
  note: string | null
  createdAt: string
}

type Experiment = {
  id: number
  title: string
  purpose: string | null
  hypothesis: string | null
  method: string | null
  testDate: string | null
  conditions: string | null
  content: string | null
  result: string | null
  problems: string | null
  improvements: string | null
  nextAction: string | null
  relatedLinks: string | null
  memo: string | null
  status: string
  createdAt: string
}

const STATUS_KO: Record<string, string> = { in_progress: '진행 중', success: '성공', failure: '실패', on_hold: '보류' }
const STATUS_BADGE: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  success:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  failure:     'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  on_hold:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const STATUS_COLOR: Record<string, string> = {
  in_progress: '#3B82F6',
  success:     '#10B981',
  failure:     '#EF4444',
  on_hold:     '#F59E0B',
}
const LOG_TYPE_KO: Record<string, string> = { status_change: '상태 변경', result_update: '결과 업데이트', note: '메모' }
const LOG_TYPE_BADGE: Record<string, string> = {
  status_change:  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  result_update:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  note:           'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{title}</h4>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
        {children}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ExperimentDetailModal({ experiment, logs, onClose, onEdit }: {
  experiment: Experiment
  logs: Log[]
  onClose: () => void
  onEdit: () => void
}) {
  const [note, setNote] = useState('')
  const [logType, setLogType] = useState<'note' | 'result_update' | 'status_change'>('note')
  const [, startTransition] = useTransition()
  const router = useRouter()
  const accentColor = STATUS_COLOR[experiment.status]

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleAddLog() {
    if (!note.trim()) return
    startTransition(async () => {
      await addExperimentLog(experiment.id, logType, note.trim())
      setNote('')
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 flex-shrink-0 rounded-t-2xl" style={{ backgroundColor: accentColor }} />

        {/* 헤더 */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[experiment.status]}`}>
                {STATUS_KO[experiment.status]}
              </span>
              {experiment.testDate && (
                <span className="text-[10px] text-gray-400">{formatDate(experiment.testDate)}</span>
              )}
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-snug">{experiment.title}</h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onEdit} className="p-2 rounded-xl text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors" title="수정">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
          {/* 계획 */}
          <div className="space-y-4">
            {experiment.purpose && <Section title="목적">{experiment.purpose}</Section>}
            {experiment.hypothesis && <Section title="가설">{experiment.hypothesis}</Section>}
            {experiment.method && <Section title="테스트 방법">{experiment.method}</Section>}
            {experiment.conditions && <Section title="조건 / 환경">{experiment.conditions}</Section>}
          </div>

          {/* 결과 */}
          {(experiment.content || experiment.result || experiment.problems || experiment.improvements || experiment.nextAction) && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">결과 기록</h3>
              {experiment.content && <Section title="진행 내용">{experiment.content}</Section>}
              {experiment.result && <Section title="결과">{experiment.result}</Section>}
              {experiment.problems && <Section title="문제점">{experiment.problems}</Section>}
              {experiment.improvements && <Section title="개선점">{experiment.improvements}</Section>}
              {experiment.nextAction && <Section title="다음 액션">{experiment.nextAction}</Section>}
            </div>
          )}

          {/* 기타 */}
          {(experiment.relatedLinks || experiment.memo) && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              {experiment.relatedLinks && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">관련 링크</p>
                  <p className="text-sm text-blue-500 dark:text-blue-400 break-all">{experiment.relatedLinks}</p>
                </div>
              )}
              {experiment.memo && <Section title="메모">{experiment.memo}</Section>}
            </div>
          )}

          {/* 로그 */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              활동 로그 ({logs.length})
            </h3>

            {/* 로그 추가 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4">
              <div className="flex gap-2 mb-2">
                {(['note', 'result_update', 'status_change'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setLogType(t)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                      logType === t ? LOG_TYPE_BADGE[t] : 'bg-white dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600'
                    }`}>
                    {LOG_TYPE_KO[t]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLog() }}
                  placeholder="로그 내용 입력 후 Enter"
                  className="flex-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 outline-none focus:border-orange-400 transition-colors"
                />
                <button
                  onClick={handleAddLog}
                  disabled={!note.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-colors"
                  style={{ backgroundColor: accentColor }}>
                  추가
                </button>
              </div>
            </div>

            {/* 로그 목록 */}
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${LOG_TYPE_BADGE[log.logType]}`}>
                      {LOG_TYPE_KO[log.logType]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{log.note}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">로그가 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
