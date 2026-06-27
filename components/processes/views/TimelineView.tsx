'use client'

import type { Process, ProcessStep, StepStatus } from '../types'
import { STEP_STATUS_LABEL, STEP_STATUS_COLOR, STEP_STATUS_DOT } from '../types'

const STATUS_BAR: Record<StepStatus, string> = {
  pending:     'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-500',
  review:      'bg-amber-500',
  completed:   'bg-emerald-500',
  on_hold:     'bg-rose-500',
}

export default function TimelineView({
  process,
  onSelectStep,
  selectedStepId,
}: {
  process: Process
  onSelectStep: (step: ProcessStep | null) => void
  selectedStepId: number | null
  onStepsChange: (steps: ProcessStep[]) => void
}) {
  const steps = [...process.steps].sort((a, b) => a.order - b.order)
  const totalMinutes = steps.reduce((s, step) => s + (step.estimatedMinutes ?? 0), 0)
  const completedMinutes = steps
    .filter((s) => s.status === 'completed')
    .reduce((s, step) => s + (step.estimatedMinutes ?? 0), 0)

  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center space-y-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">단계를 추가하면 타임라인이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 상단 요약 */}
      {totalMinutes > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">총 예상 시간</span>
              <span className="ml-2 text-sm text-gray-500">{Math.floor(totalMinutes / 60) > 0 ? `${Math.floor(totalMinutes / 60)}시간 ` : ''}{totalMinutes % 60}분</span>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0}% 완료
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div className="relative">
        {/* 세로선 */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const isSelected = step.id === selectedStepId
            const isCompleted = step.status === 'completed'
            const doneChecks = step.checklist.filter((c) => c.done).length

            return (
              <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* 타임라인 노드 */}
                <div className="flex-shrink-0 flex flex-col items-center" style={{ width: '48px' }}>
                  <div
                    onClick={() => onSelectStep(isSelected ? null : step)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-10 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{idx + 1}</span>
                    )}
                  </div>
                </div>

                {/* 카드 */}
                <div
                  onClick={() => onSelectStep(isSelected ? null : step)}
                  className={`flex-1 bg-white dark:bg-gray-900 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-300 dark:ring-blue-800'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {/* 상단 바 (상태 표시) */}
                  <div className={`h-1 rounded-t-2xl ${STATUS_BAR[step.status]}`} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STEP_STATUS_COLOR[step.status]}`}>
                            {STEP_STATUS_LABEL[step.status]}
                          </span>
                          {step.estimatedMinutes && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {step.estimatedMinutes}분
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</h3>
                        {step.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{step.description}</p>
                        )}
                      </div>

                      {/* 예상 시간 바 */}
                      {step.estimatedMinutes && totalMinutes > 0 && (
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[9px] text-gray-400">{Math.round((step.estimatedMinutes / totalMinutes) * 100)}%</span>
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${STATUS_BAR[step.status]}`}
                              style={{ width: `${Math.round((step.estimatedMinutes / totalMinutes) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 체크리스트 */}
                    {step.checklist.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] text-gray-400">체크리스트</span>
                          <span className="text-[10px] font-semibold text-gray-500">{doneChecks}/{step.checklist.length}</span>
                        </div>
                        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.round((doneChecks / step.checklist.length) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          {step.checklist.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${c.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                {c.done && <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </span>
                              <span className={`text-[10px] ${c.done ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{c.text}</span>
                            </div>
                          ))}
                          {step.checklist.length > 3 && (
                            <p className="text-[10px] text-gray-400 pl-4">+{step.checklist.length - 3}개 더</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 완료 조건 */}
                    {step.completionCondition && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{step.completionCondition}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
