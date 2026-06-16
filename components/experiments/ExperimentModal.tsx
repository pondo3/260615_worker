'use client'

import { useActionState, useEffect, useState } from 'react'
import { createExperiment, updateExperiment } from '@/app/actions/experiments'

type Experiment = {
  id: number
  title: string
  purpose: string | null
  hypothesis: string | null
  method: string | null
  testDate: Date | null
  conditions: string | null
  content: string | null
  result: string | null
  problems: string | null
  improvements: string | null
  nextAction: string | null
  relatedLinks: string | null
  memo: string | null
  status: string
}

type Props = { onClose: () => void; experiment?: Experiment }

const STATUS_OPTIONS = [
  { value: 'in_progress', label: '진행 중', cls: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'success',     label: '성공',   cls: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'failure',     label: '실패',   cls: 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  { value: 'on_hold',     label: '보류',   cls: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
]

const STATUS_COLOR: Record<string, string> = {
  in_progress: '#3B82F6',
  success:     '#10B981',
  failure:     '#EF4444',
  on_hold:     '#F59E0B',
}

function toDateInput(d: Date | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

function Field({ label, name, defaultValue, placeholder, rows = 3 }: {
  label: string; name: string; defaultValue?: string | null; placeholder?: string; rows?: number
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-orange-400 transition-colors resize-none"
      />
    </div>
  )
}

export default function ExperimentModal({ onClose, experiment }: Props) {
  const isEdit = !!experiment
  const action = isEdit ? updateExperiment : createExperiment
  const [state, formAction, pending] = useActionState(action, undefined)
  const [tab, setTab] = useState<'plan' | 'result'>('plan')
  const [status, setStatus] = useState(experiment?.status ?? 'in_progress')
  const accentColor = STATUS_COLOR[status]

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl transition-colors" style={{ backgroundColor: accentColor }} />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '테스트 수정' : '새 테스트'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {([['plan', '계획'], ['result', '결과']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                tab === key
                  ? 'border-b-2 text-gray-900 dark:text-white'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              style={tab === key ? { borderColor: accentColor } : {}}>
              {label}
            </button>
          ))}
        </div>

        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={experiment.id} />}
          {isEdit && <input type="hidden" name="status" value={status} />}

          <div className="px-6 py-5 space-y-4">

            {/* 계획 탭 */}
            {tab === 'plan' && (
              <>
                <div>
                  <input
                    name="title"
                    defaultValue={experiment?.title}
                    placeholder="테스트 제목 *"
                    className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-orange-400 pb-2 transition-colors"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">테스트 날짜</label>
                  <input
                    type="date"
                    name="testDate"
                    defaultValue={toDateInput(experiment?.testDate)}
                    className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-orange-400 transition-colors"
                  />
                </div>

                <Field label="목적" name="purpose" defaultValue={experiment?.purpose} placeholder="이 테스트를 왜 하는가?" rows={2} />
                <Field label="가설" name="hypothesis" defaultValue={experiment?.hypothesis} placeholder="테스트 전에 예상하는 결과는?" rows={2} />
                <Field label="테스트 방법" name="method" defaultValue={experiment?.method} placeholder="어떤 방법으로 테스트하는가?" rows={3} />
                <Field label="테스트 조건 / 환경" name="conditions" defaultValue={experiment?.conditions} placeholder="테스트 조건, 환경, 변수 등" rows={2} />
              </>
            )}

            {/* 결과 탭 */}
            {tab === 'result' && (
              <>
                {isEdit && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">상태</label>
                    <div className="grid grid-cols-4 gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                          className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                            status === opt.value ? opt.cls + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Field label="진행 내용" name="content" defaultValue={experiment?.content} placeholder="실제로 어떻게 진행했는가?" rows={4} />
                <Field label="결과" name="result" defaultValue={experiment?.result} placeholder="테스트 결과는 어땠는가?" rows={4} />
                <Field label="문제점" name="problems" defaultValue={experiment?.problems} placeholder="발견된 문제점이나 예상과 달랐던 점" rows={2} />
                <Field label="개선점" name="improvements" defaultValue={experiment?.improvements} placeholder="다음에 개선할 점" rows={2} />
                <Field label="다음 액션" name="nextAction" defaultValue={experiment?.nextAction} placeholder="이 테스트 결과로 다음에 할 일" rows={2} />
                <Field label="관련 링크" name="relatedLinks" defaultValue={experiment?.relatedLinks} placeholder="참고 URL, 영상 링크 등" rows={1} />
                <Field label="메모" name="memo" defaultValue={experiment?.memo} placeholder="기타 메모" rows={2} />
              </>
            )}

            {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
          </div>

          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '테스트 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
