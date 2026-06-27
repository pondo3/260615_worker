'use client'

import { useState } from 'react'
import { updateStep } from '@/app/actions/processes'
import type { Process, ProcessStep, StepStatus } from '../types'
import { STEP_STATUS_LABEL } from '../types'

const COLUMNS: StepStatus[] = ['pending', 'in_progress', 'review', 'completed', 'on_hold']

const COL_STYLE: Record<StepStatus, { header: string; bg: string; dot: string }> = {
  pending:     { header: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800/40',         dot: 'bg-gray-400' },
  in_progress: { header: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',         dot: 'bg-blue-500' },
  review:      { header: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20',       dot: 'bg-amber-500' },
  completed:   { header: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500' },
  on_hold:     { header: 'text-rose-600 dark:text-rose-400',   bg: 'bg-rose-50 dark:bg-rose-900/20',         dot: 'bg-rose-500' },
}

export default function KanbanView({
  process,
  onSelectStep,
  selectedStepId,
  onStepsChange,
}: {
  process: Process
  onSelectStep: (step: ProcessStep | null) => void
  selectedStepId: number | null
  onStepsChange: (steps: ProcessStep[]) => void
}) {
  const [steps, setSteps] = useState(process.steps)

  async function moveToStatus(step: ProcessStep, status: StepStatus) {
    if (step.status === status) return
    const updated = steps.map((s) => s.id === step.id ? { ...s, status } : s)
    setSteps(updated)
    onStepsChange(updated)
    await updateStep(step.id, { status })
  }

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-3 h-full p-4 min-w-max">
        {COLUMNS.map((col) => {
          const colSteps = steps.filter((s) => s.status === col)
          const style = COL_STYLE[col]
          return (
            <div key={col} className="w-52 flex flex-col gap-2 flex-shrink-0">
              {/* 컬럼 헤더 */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                <span className={`text-xs font-semibold ${style.header}`}>{STEP_STATUS_LABEL[col]}</span>
                <span className="ml-auto text-xs text-gray-400">{colSteps.length}</span>
              </div>

              {/* 카드 목록 */}
              <div className={`flex-1 rounded-xl ${style.bg} p-2 space-y-2 min-h-24`}>
                {colSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => onSelectStep(selectedStepId === step.id ? null : step)}
                    className={`p-3 rounded-lg bg-white dark:bg-gray-900 border cursor-pointer shadow-sm transition-all hover:shadow-md ${
                      selectedStepId === step.id ? 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-300' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">{step.title}</p>
                    {step.estimatedMinutes && (
                      <p className="text-[10px] text-gray-400">⏱ {step.estimatedMinutes}분</p>
                    )}
                    {step.checklist.length > 0 && (
                      <p className="text-[10px] text-gray-400">
                        ✓ {step.checklist.filter((c) => c.done).length}/{step.checklist.length}
                      </p>
                    )}

                    {/* 상태 변경 */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c !== col).map((c) => (
                        <button
                          key={c}
                          onClick={(e) => { e.stopPropagation(); moveToStatus(step, c) }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          → {STEP_STATUS_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {colSteps.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-[10px] text-gray-400 dark:text-gray-600">
                    비어있음
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
