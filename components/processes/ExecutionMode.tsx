'use client'

import { useState } from 'react'
import { startExecution, updateExecutionStep, completeExecution } from '@/app/actions/processes'
import type { Process } from './types'
import { STEP_STATUS_DOT } from './types'

export default function ExecutionMode({
  process,
  onClose,
}: {
  process: Process
  onClose: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [executionId, setExecutionId] = useState<number | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<number, 'pending' | 'in_progress' | 'completed'>>(
    Object.fromEntries(process.steps.map((s) => [s.id, 'pending']))
  )
  const [starting, setStarting] = useState(false)

  const steps = [...process.steps].sort((a, b) => a.order - b.order)
  const completedCount = Object.values(stepStatuses).filter((s) => s === 'completed').length
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  async function handleStart() {
    setStarting(true)
    const exec = await startExecution(process.id)
    setExecutionId(exec.id)
    const initialStatuses: Record<number, 'pending' | 'in_progress' | 'completed'> = {}
    exec.stepExecutions.forEach((se) => { initialStatuses[se.stepId] = 'pending' })
    setStepStatuses(initialStatuses)
    setPhase('running')
    setStarting(false)
  }

  async function handleToggleStep(stepId: number, execStepId?: number) {
    if (phase !== 'running') return
    const current = stepStatuses[stepId]
    const next = current === 'completed' ? 'pending' : 'completed'
    setStepStatuses((prev) => ({ ...prev, [stepId]: next }))

    if (execStepId) {
      await updateExecutionStep(execStepId, next)
    }

    const allDone = { ...stepStatuses, [stepId]: next }
    if (Object.values(allDone).every((s) => s === 'completed')) {
      setPhase('done')
    }
  }

  async function handleComplete() {
    if (executionId) await completeExecution(executionId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-900 dark:text-white">{process.title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {phase === 'idle' ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">프로세스를 시작하면 각 단계를 체크할 수 있습니다.</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">진행률</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{completedCount}/{steps.length} ({progress}%)</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 단계 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
          {steps.map((step, idx) => {
            const status = stepStatuses[step.id] ?? 'pending'
            const isCompleted = status === 'completed'
            return (
              <div
                key={step.id}
                onClick={() => handleToggleStep(step.id)}
                className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors ${
                  phase === 'running' ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40' : 'opacity-60 cursor-not-allowed'
                } ${isCompleted ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                  {idx + 1}
                </span>
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isCompleted && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{step.description}</p>
                  )}
                </div>
                {step.estimatedMinutes && (
                  <span className="flex-shrink-0 text-xs text-gray-400">⏱ {step.estimatedMinutes}분</span>
                )}
                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${STEP_STATUS_DOT[step.status]}`} />
              </div>
            )
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          {phase === 'idle' && (
            <button
              onClick={handleStart}
              disabled={starting || steps.length === 0}
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {starting ? '시작 중...' : '프로세스 시작'}
            </button>
          )}
          {phase === 'running' && (
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                나중에 계속
              </button>
              <button onClick={handleComplete} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                완료로 기록
              </button>
            </div>
          )}
          {phase === 'done' && (
            <div className="text-center">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">🎉 모든 단계 완료!</p>
              <button onClick={handleComplete} className="w-full py-2.5 text-sm font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                완료 저장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
