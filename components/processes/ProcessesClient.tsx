'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  createProcess, updateProcess, deleteProcess, toggleFavorite,
  createStep, cloneProcess,
} from '@/app/actions/processes'
import type { Process, ProcessStep } from './types'
import { CATEGORIES, IMPORTANCE_OPTIONS, STEP_STATUS_DOT } from './types'
import ChecklistView from './views/ChecklistView'
import KanbanView from './views/KanbanView'
import TimelineView from './views/TimelineView'
import StepDetailPanel from './StepDetailPanel'
import ExecutionMode from './ExecutionMode'
import ExecutionHistoryModal from './ExecutionHistoryModal'

const FlowchartView = dynamic(() => import('./views/FlowchartView'), { ssr: false })
const MindmapView = dynamic(() => import('./views/MindmapView'), { ssr: false })

type ViewMode = 'mindmap' | 'flowchart' | 'checklist' | 'kanban' | 'timeline'
type Toast = { id: number; message: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++counter.current
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }, [])
  return { toasts, show }
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-80 mx-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">삭제</button>
        </div>
      </div>
    </div>
  )
}

// ─── 전체 개요 대시보드 ──────────────────────────────────────────────────────

function OverviewDashboard({
  processes,
  onSelect,
  onNew,
}: {
  processes: Process[]
  onSelect: (p: Process) => void
  onNew: () => void
}) {
  const totalSteps = processes.reduce((a, p) => a + p.steps.length, 0)
  const completedSteps = processes.reduce((a, p) => a + p.steps.filter((s) => s.status === 'completed').length, 0)
  const inProgressSteps = processes.reduce((a, p) => a + p.steps.filter((s) => s.status === 'in_progress').length, 0)
  const blockedSteps = processes.reduce((a, p) => a + p.steps.filter((s) => s.status === 'on_hold').length, 0)
  const activeProcesses = processes.filter((p) => p.status === 'active')

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">프로세스 현황</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">전체 {processes.length}개 · 활성 {activeProcesses.length}개</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체 단계', value: totalSteps, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-800' },
          { label: '완료', value: completedSteps, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: '진행 중', value: inProgressSteps, color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: '보류', value: blockedSteps, color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-900/20' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 전체 진행률 */}
      {totalSteps > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">전체 진행률</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round((completedSteps / totalSteps) * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completedSteps / totalSteps) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 프로세스 카드 */}
      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 gap-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">아직 프로세스가 없습니다</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">반복되는 업무 흐름을 프로세스로 만들어보세요</p>
          </div>
          <button onClick={onNew} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            첫 프로세스 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {processes.map((proc) => {
            const done = proc.steps.filter((s) => s.status === 'completed').length
            const inProg = proc.steps.filter((s) => s.status === 'in_progress').length
            const blocked = proc.steps.filter((s) => s.status === 'on_hold').length
            const pct = proc.steps.length > 0 ? Math.round((done / proc.steps.length) * 100) : 0
            return (
              <div key={proc.id} onClick={() => onSelect(proc)}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {proc.isFavorite && <span className="text-amber-400 flex-shrink-0 text-xs">★</span>}
                      {proc.isTemplate && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold flex-shrink-0">템플릿</span>}
                      {proc.category && <span className="text-[9px] text-gray-400">{proc.category}</span>}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{proc.title}</h3>
                    {proc.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{proc.description}</p>}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 flex-shrink-0 transition-colors mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {proc.steps.length > 0 ? (
                  <>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-gray-400">{done}/{proc.steps.length} 완료 ({pct}%)</span>
                      {inProg > 0 && <span className="flex items-center gap-1 text-blue-500"><span className={`w-1.5 h-1.5 rounded-full ${STEP_STATUS_DOT['in_progress']}`} />진행 중 {inProg}</span>}
                      {blocked > 0 && <span className="flex items-center gap-1 text-rose-500"><span className={`w-1.5 h-1.5 rounded-full ${STEP_STATUS_DOT['on_hold']}`} />보류 {blocked}</span>}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">단계 없음 · 클릭해서 추가</p>
                )}

                {proc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proc.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{tag}</span>
                    ))}
                    {proc.tags.length > 3 && <span className="text-[9px] text-gray-400">+{proc.tags.length - 3}</span>}
                  </div>
                )}

                {/* 템플릿 복제 버튼 */}
                {proc.isTemplate && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const newProc = await cloneProcess(proc.id)
                      onSelect({ ...proc, id: newProc.id, title: newProc.title, isTemplate: false, steps: [], connections: [], executionCount: 0, createdAt: newProc.createdAt.toISOString(), updatedAt: newProc.updatedAt.toISOString(), lastUsedAt: null })
                    }}
                    className="mt-3 w-full py-1.5 text-[11px] font-semibold rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors border border-violet-200 dark:border-violet-800"
                  >
                    이 템플릿으로 시작
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 프로세스 폼 ────────────────────────────────────────────────────────────

function ProcessFormModal({ initial, onSave, onClose }: { initial?: Partial<Process>; onSave: (proc: Process) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [purpose, setPurpose] = useState(initial?.purpose ?? '')
  const [importance, setImportance] = useState(initial?.importance ?? '보통')
  const [isTemplate, setIsTemplate] = useState(initial?.isTemplate ?? false)
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    if (initial?.id) {
      await updateProcess(initial.id, { title: title.trim(), description: description || null, category: category || null, purpose: purpose || null, importance, tags, isTemplate })
      onSave({ ...initial as Process, title: title.trim(), description: description || null, category: category || null, purpose: purpose || null, importance, tags, isTemplate })
    } else {
      const proc = await createProcess({ title: title.trim(), description, category, purpose, importance, tags, isTemplate })
      onSave({
        id: proc.id, title: proc.title, description: proc.description, category: proc.category,
        purpose: proc.purpose, status: proc.status, importance: proc.importance,
        tags: Array.isArray(proc.tags) ? (proc.tags as string[]) : [],
        isTemplate: proc.isTemplate, isFavorite: proc.isFavorite, projectId: proc.projectId,
        lastUsedAt: proc.lastUsedAt?.toISOString() ?? null,
        createdAt: proc.createdAt.toISOString(), updatedAt: proc.updatedAt.toISOString(),
        executionCount: 0, steps: [], connections: [],
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-gray-900 dark:text-white">{initial?.id ? '프로세스 편집' : '새 프로세스'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">프로세스명 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 유튜브 영상 제작" autoFocus
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="이 프로세스의 목적을 간략히..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">선택 안 함</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">중요도</label>
              <select value={importance} onChange={(e) => setImportance(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">사용 목적</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="이 프로세스를 언제 사용하나요?"
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">태그 (쉼표로 구분)</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="콘텐츠, 반복, 업무"
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">템플릿으로 저장</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 단계 추가 폼 ─────────────────────────────────────────────────────────────

function AddStepForm({ processId, onAdded }: { processId: number; onAdded: (step: ProcessStep) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    const step = await createStep(processId, {
      title: title.trim(),
      estimatedMinutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
    })
    onAdded({
      id: step.id, processId: step.processId, title: step.title, description: step.description,
      order: step.order, status: step.status as ProcessStep['status'],
      checklist: [], estimatedMinutes: step.estimatedMinutes,
      completionCondition: step.completionCondition, relatedLinks: [], memo: step.memo,
      posX: step.posX, posY: step.posY,
      createdAt: step.createdAt.toISOString(), updatedAt: step.updatedAt.toISOString(),
    })
    setTitle(''); setEstimatedMinutes(''); setSaving(false); setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        단계 추가
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="단계명..." autoFocus
        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
      <input type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value === '' ? '' : Number(e.target.value))} placeholder="분"
        className="w-14 text-xs px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
      <button onClick={handleAdd} disabled={saving || !title.trim()} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
        {saving ? '...' : '추가'}
      </button>
      <button onClick={() => setOpen(false)} className="px-2 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">✕</button>
    </div>
  )
}

// ─── 뷰 탭 정의 ──────────────────────────────────────────────────────────────

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: 'mindmap', label: '마인드맵', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
  { key: 'flowchart', label: '순서도', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  { key: 'timeline', label: '타임라인', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'checklist', label: '체크리스트', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
  { key: 'kanban', label: '칸반', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg> },
]

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function ProcessesClient({ initialProcesses }: { initialProcesses: Process[] }) {
  const { toasts, show } = useToast()

  const [processes, setProcesses] = useState<Process[]>(initialProcesses)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('mindmap')

  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'templates'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [showProcessForm, setShowProcessForm] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | undefined>()
  const [showExecution, setShowExecution] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const filteredProcesses = processes.filter((p) => {
    if (filterTab === 'favorites' && !p.isFavorite) return false
    if (filterTab === 'templates' && !p.isTemplate) return false
    if (filterCategory && p.category !== filterCategory) return false
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  function selectProcess(proc: Process) {
    setSelectedProcess(proc)
    setSelectedStep(null)
  }

  function handleStepsChange(updatedSteps: ProcessStep[]) {
    if (!selectedProcess) return
    const updated = { ...selectedProcess, steps: updatedSteps }
    setSelectedProcess(updated)
    setProcesses((prev) => prev.map((p) => p.id === updated.id ? updated : p))
  }

  function handleStepUpdated(updatedStep: ProcessStep) {
    if (!selectedProcess) return
    const updatedSteps = selectedProcess.steps.map((s) => s.id === updatedStep.id ? updatedStep : s)
    const updated = { ...selectedProcess, steps: updatedSteps }
    setSelectedProcess(updated)
    setProcesses((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setSelectedStep(updatedStep)
  }

  function handleStepAdded(step: ProcessStep) {
    if (!selectedProcess) return
    const updated = { ...selectedProcess, steps: [...selectedProcess.steps, step] }
    setSelectedProcess(updated)
    setProcesses((prev) => prev.map((p) => p.id === updated.id ? updated : p))
  }

  async function handleToggleFavorite(proc: Process) {
    const next = !proc.isFavorite
    await toggleFavorite(proc.id, next)
    setProcesses((prev) => prev.map((p) => p.id === proc.id ? { ...p, isFavorite: next } : p))
    if (selectedProcess?.id === proc.id) setSelectedProcess((p) => p ? { ...p, isFavorite: next } : p)
  }

  function confirmDelete(proc: Process) {
    setConfirmModal({
      message: `"${proc.title}" 프로세스를 삭제하시겠습니까? 모든 단계와 실행 이력이 삭제됩니다.`,
      onConfirm: async () => {
        setConfirmModal(null)
        await deleteProcess(proc.id)
        setProcesses((prev) => prev.filter((p) => p.id !== proc.id))
        if (selectedProcess?.id === proc.id) { setSelectedProcess(null); setSelectedStep(null) }
        show('프로세스가 삭제되었습니다.')
      },
    })
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── 왼쪽: 목록 ── */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">프로세스</h1>
            <button onClick={() => { setEditingProcess(undefined); setShowProcessForm(true) }}
              className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="검색..."
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {(['all', 'favorites', 'templates'] as const).map((tab) => (
            <button key={tab} onClick={() => setFilterTab(tab)}
              className={`flex-1 py-2 text-[10px] font-semibold transition-colors ${filterTab === tab ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {tab === 'all' ? '전체' : tab === 'favorites' ? '즐겨찾기' : '템플릿'}
            </button>
          ))}
        </div>

        <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800/50 flex-shrink-0">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-[10px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none">
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* 개요 버튼 */}
        <button onClick={() => { setSelectedProcess(null); setSelectedStep(null) }}
          className={`mx-3 mt-2 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${!selectedProcess ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>
          전체 개요
        </button>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-xs text-center px-4 gap-2">
              <p>프로세스가 없습니다.</p>
              <button onClick={() => { setEditingProcess(undefined); setShowProcessForm(true) }} className="text-blue-500 hover:underline">새로 만들기</button>
            </div>
          ) : (
            filteredProcesses.map((proc) => {
              const isSelected = selectedProcess?.id === proc.id
              const done = proc.steps.filter((s) => s.status === 'completed').length
              const inProg = proc.steps.filter((s) => s.status === 'in_progress').length
              const pct = proc.steps.length > 0 ? Math.round((done / proc.steps.length) * 100) : 0
              return (
                <div key={proc.id} onClick={() => selectProcess(proc)}
                  className={`group px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{proc.title}</p>
                      {proc.steps.length > 0 && (
                        <div className="mt-1">
                          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-0.5">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-400">
                            <span>{pct}%</span>
                            {inProg > 0 && <span className="text-blue-500">· 진행중 {inProg}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(proc) }}
                        className={`p-1 rounded transition-colors ${proc.isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}>
                        <svg className="w-3 h-3" fill={proc.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingProcess(proc); setShowProcessForm(true) }}
                        className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); confirmDelete(proc) }}
                        className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── 중앙 ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!selectedProcess ? (
          <OverviewDashboard processes={filteredProcesses} onSelect={selectProcess} onNew={() => { setEditingProcess(undefined); setShowProcessForm(true) }} />
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
              <button onClick={() => { setSelectedProcess(null); setSelectedStep(null) }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white truncate">{selectedProcess.title}</h2>
                <p className="text-[10px] text-gray-400">
                  {selectedProcess.category && `${selectedProcess.category} · `}
                  {selectedProcess.steps.filter((s) => s.status === 'completed').length}/{selectedProcess.steps.length}단계 완료
                </p>
              </div>

              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
                {VIEW_TABS.map((v) => (
                  <button key={v.key} onClick={() => setViewMode(v.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === v.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    {v.icon}
                    <span className="hidden lg:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              <AddStepForm processId={selectedProcess.id} onAdded={handleStepAdded} />

              <button onClick={() => setShowHistory(true)}
                className="flex-shrink-0 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="실행 이력">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>

              <button onClick={() => setShowExecution(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                실행
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 overflow-hidden">
                {viewMode === 'mindmap' && <MindmapView process={selectedProcess} onSelectStep={(s) => setSelectedStep(s)} selectedStepId={selectedStep?.id ?? null} onStepsChange={handleStepsChange} />}
                {viewMode === 'flowchart' && <FlowchartView process={selectedProcess} onSelectStep={(s) => setSelectedStep(s)} selectedStepId={selectedStep?.id ?? null} onStepsChange={handleStepsChange} />}
                {viewMode === 'timeline' && <TimelineView process={selectedProcess} onSelectStep={(s) => setSelectedStep(s)} selectedStepId={selectedStep?.id ?? null} onStepsChange={handleStepsChange} />}
                {viewMode === 'checklist' && <ChecklistView process={selectedProcess} onSelectStep={(s) => setSelectedStep(s)} selectedStepId={selectedStep?.id ?? null} onStepsChange={handleStepsChange} />}
                {viewMode === 'kanban' && <KanbanView process={selectedProcess} onSelectStep={(s) => setSelectedStep(s)} selectedStepId={selectedStep?.id ?? null} onStepsChange={handleStepsChange} />}
              </div>
              {selectedStep && (
                <div className="w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <StepDetailPanel key={selectedStep.id} step={selectedStep} onClose={() => setSelectedStep(null)} onStepUpdated={handleStepUpdated} />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showProcessForm && (
        <ProcessFormModal
          initial={editingProcess}
          onSave={(proc) => {
            if (editingProcess?.id) {
              setProcesses((prev) => prev.map((p) => p.id === proc.id ? { ...p, ...proc } : p))
              if (selectedProcess?.id === proc.id) setSelectedProcess((p) => p ? { ...p, ...proc } : p)
            } else {
              setProcesses((prev) => [proc, ...prev])
              setSelectedProcess(proc)
            }
            show(editingProcess?.id ? '수정되었습니다.' : '생성되었습니다.')
          }}
          onClose={() => { setShowProcessForm(false); setEditingProcess(undefined) }}
        />
      )}

      {showExecution && selectedProcess && (
        <ExecutionMode process={selectedProcess} onClose={() => { setShowExecution(false); show('실행이 기록되었습니다.') }} />
      )}

      {showHistory && selectedProcess && (
        <ExecutionHistoryModal processId={selectedProcess.id} processTitle={selectedProcess.title} onClose={() => setShowHistory(false)} />
      )}

      {confirmModal && (
        <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
      )}

      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div key={t.id} className={`w-72 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border-l-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${t.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'} text-gray-900 dark:text-white`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
