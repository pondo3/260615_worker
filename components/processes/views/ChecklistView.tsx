'use client'

import { useState } from 'react'
import { updateStep, deleteStep, reorderSteps } from '@/app/actions/processes'
import type { Process, ProcessStep, StepStatus } from '../types'
import { STEP_STATUS_LABEL, STEP_STATUS_COLOR, STEP_STATUS_DOT } from '../types'

const STATUS_CYCLE: StepStatus[] = ['pending', 'in_progress', 'review', 'completed', 'on_hold']

export default function ChecklistView({
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
  const [saving, setSaving] = useState<number | null>(null)

  async function cycleStatus(step: ProcessStep) {
    const idx = STATUS_CYCLE.indexOf(step.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setSaving(step.id)
    const updated = steps.map((s) => s.id === step.id ? { ...s, status: next } : s)
    setSteps(updated)
    onStepsChange(updated)
    await updateStep(step.id, { status: next })
    setSaving(null)
  }

  async function toggleChecklistItem(step: ProcessStep, itemIdx: number) {
    const newChecklist = step.checklist.map((c, i) => i === itemIdx ? { ...c, done: !c.done } : c)
    const updated = steps.map((s) => s.id === step.id ? { ...s, checklist: newChecklist } : s)
    setSteps(updated)
    onStepsChange(updated)
    await updateStep(step.id, { checklist: newChecklist })
  }

  async function moveStep(idx: number, dir: -1 | 1) {
    const newSteps = [...steps]
    const target = idx + dir
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]]
    const reordered = newSteps.map((s, i) => ({ ...s, order: i }))
    setSteps(reordered)
    onStepsChange(reordered)
    await reorderSteps(process.id, reordered.map((s) => s.id))
  }

  async function handleDelete(stepId: number) {
    const updated = steps.filter((s) => s.id !== stepId)
    setSteps(updated)
    onStepsChange(updated)
    if (selectedStepId === stepId) onSelectStep(null)
    await deleteStep(stepId)
  }

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <div className="h-full flex flex-col">
      {/* 진행률 바 */}
      {steps.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">전체 진행률</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{completedCount}/{steps.length} ({progress}%)</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 단계 목록 */}
      <div className="flex-1 overflow-y-auto">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">단계를 추가해 프로세스를 만들어보세요.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {steps.map((step, idx) => {
              const isSelected = selectedStepId === step.id
              const doneChecklist = step.checklist.filter((c) => c.done).length
              return (
                <div
                  key={step.id}
                  className={`group px-4 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                  onClick={() => onSelectStep(isSelected ? null : step)}
                >
                  <div className="flex items-start gap-3">
                    {/* 순서 번호 */}
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                      {idx + 1}
                    </span>

                    {/* 상태 도트 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleStatus(step) }}
                      disabled={saving === step.id}
                      title="클릭해서 상태 변경"
                      className={`flex-shrink-0 w-4 h-4 rounded-full mt-1 transition-transform hover:scale-125 ${STEP_STATUS_DOT[step.status]}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${step.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {step.title}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STEP_STATUS_COLOR[step.status]}`}>
                          {STEP_STATUS_LABEL[step.status]}
                        </span>
                        {step.estimatedMinutes && (
                          <span className="text-[10px] text-gray-400">⏱ {step.estimatedMinutes}분</span>
                        )}
                      </div>

                      {step.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{step.description}</p>
                      )}

                      {/* 체크리스트 미리보기 */}
                      {step.checklist.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {step.checklist.slice(0, isSelected ? undefined : 3).map((item, i) => (
                            <label key={i} className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleChecklistItem(step, i)}
                                className="w-3 h-3 rounded border-gray-300 text-emerald-500"
                              />
                              <span className={`text-xs ${item.done ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{item.text}</span>
                            </label>
                          ))}
                          {!isSelected && step.checklist.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{step.checklist.length - 3}개 더</span>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">{doneChecklist}/{step.checklist.length} 완료</p>
                        </div>
                      )}
                    </div>

                    {/* 순서 이동 + 삭제 버튼 */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); moveStep(idx, -1) }} disabled={idx === 0} className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveStep(idx, 1) }} disabled={idx === steps.length - 1} className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(step.id) }} className="p-1 rounded text-gray-400 hover:text-red-500 ml-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
