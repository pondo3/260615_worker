'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  createProcess, updateProcess, deleteProcess, toggleFavorite,
  createStep, updateStep,
} from '@/app/actions/processes'
import type { Process, ProcessStep } from './types'
import { CATEGORIES, IMPORTANCE_OPTIONS, STEP_STATUS_LABEL } from './types'
import ChecklistView from './views/ChecklistView'
import KanbanView from './views/KanbanView'
import StepDetailPanel from './StepDetailPanel'
import ExecutionMode from './ExecutionMode'

// React Flow는 SSR에서 사용 불가
const FlowchartView = dynamic(() => import('./views/FlowchartView'), { ssr: false })

type ViewMode = 'flowchart' | 'checklist' | 'kanban'
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

// ─── 프로세스 폼 모달 ────────────────────────────────────────────────────────

function ProcessFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Process>
  onSave: (proc: Process) => void
  onClose: () => void
}) {
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">프로세스명 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 유튜브 영상 제작" autoFocus
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="이 프로세스의 목적을 간략히..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택 안 함</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">중요도</label>
              <select value={importance} onChange={(e) => setImportance(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {IMPORTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">사용 목적</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="이 프로세스를 언제 사용하나요?"
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">태그 (쉼표로 구분)</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="콘텐츠, 반복, 업무"
              className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    const step = await createStep(processId, {
      title: title.trim(),
      description: description || undefined,
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
    setTitle(''); setDescription(''); setEstimatedMinutes(''); setSaving(false); setOpen(false)
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
    <div className="space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="단계명 *" autoFocus
        className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)"
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
        />
        <div className="flex items-center gap-1">
          <input type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value === '' ? '' : Number(e.target.value))} placeholder="분"
            className="w-16 text-sm px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          />
          <span className="text-xs text-gray-400 flex-shrink-0">분</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
        <button onClick={handleAdd} disabled={saving || !title.trim()} className="flex-1 py-2 text-xs font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
          {saving ? '추가 중...' : '단계 추가'}
        </button>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function ProcessesClient({ initialProcesses }: { initialProcesses: Process[] }) {
  const { toasts, show } = useToast()

  const [processes, setProcesses] = useState<Process[]>(initialProcesses)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('flowchart')

  // 필터
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'templates'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // 모달
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | undefined>()
  const [showExecution, setShowExecution] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // 필터된 목록
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

  const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'flowchart', label: '순서도', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { key: 'checklist', label: '체크리스트', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { key: 'kanban', label: '칸반', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg> },
  ]

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ── 왼쪽: 프로세스 목록 ── */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-gray-900 dark:text-white text-sm">프로세스 관리</h1>
            <button
              onClick={() => { setEditingProcess(undefined); setShowProcessForm(true) }}
              className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
              title="새 프로세스"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="프로세스 검색..."
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {(['all', 'favorites', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 py-2 text-[10px] font-semibold transition-colors ${filterTab === tab ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {tab === 'all' ? '전체' : tab === 'favorites' ? '즐겨찾기' : '템플릿'}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-800/50 flex-shrink-0">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-[10px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none"
          >
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-xs text-center px-4 gap-2">
              <p>프로세스가 없습니다.</p>
              <button onClick={() => { setEditingProcess(undefined); setShowProcessForm(true) }} className="text-blue-500 hover:underline">새로 만들기</button>
            </div>
          ) : (
            filteredProcesses.map((proc) => {
              const isSelected = selectedProcess?.id === proc.id
              const completedSteps = proc.steps.filter((s) => s.status === 'completed').length
              return (
                <div
                  key={proc.id}
                  onClick={() => selectProcess(proc)}
                  className={`group px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{proc.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {proc.category && <span className="text-[9px] text-gray-400">{proc.category}</span>}
                        {proc.steps.length > 0 && (
                          <span className="text-[9px] text-gray-400">{completedSteps}/{proc.steps.length}</span>
                        )}
                        {proc.isTemplate && <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">템플릿</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(proc) }} className={`p-1 rounded transition-colors ${proc.isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`} title="즐겨찾기">
                        <svg className="w-3 h-3" fill={proc.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingProcess(proc); setShowProcessForm(true) }} className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors" title="편집">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); confirmDelete(proc) }} className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors" title="삭제">
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

      {/* ── 중앙: 시각화 ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!selectedProcess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">왼쪽에서 프로세스를 선택하세요</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">또는 새 프로세스를 만들어보세요</p>
            </div>
            <button onClick={() => { setEditingProcess(undefined); setShowProcessForm(true) }} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              새 프로세스 만들기
            </button>
          </div>
        ) : (
          <>
            {/* 툴바 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-white truncate">{selectedProcess.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedProcess.category && <span className="text-[10px] text-gray-400">{selectedProcess.category}</span>}
                  {selectedProcess.importance !== '보통' && <span className="text-[10px] text-gray-400">중요도: {selectedProcess.importance}</span>}
                  <span className="text-[10px] text-gray-400">{selectedProcess.steps.filter((s) => s.status === 'completed').length}/{selectedProcess.steps.length}단계 완료</span>
                </div>
              </div>

              {/* 뷰 전환 */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
                {VIEW_TABS.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === v.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    {v.icon}
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              {/* 단계 추가 */}
              <div className="flex-shrink-0">
                <AddStepForm processId={selectedProcess.id} onAdded={handleStepAdded} />
              </div>

              {/* 프로세스 시작 */}
              <button
                onClick={() => setShowExecution(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                실행
              </button>
            </div>

            {/* 뷰 영역 */}
            <div className="flex-1 overflow-hidden flex">
              <div className="flex-1 overflow-hidden">
                {viewMode === 'flowchart' && (
                  <FlowchartView
                    process={selectedProcess}
                    onSelectStep={(step) => setSelectedStep(step)}
                    selectedStepId={selectedStep?.id ?? null}
                    onStepsChange={handleStepsChange}
                  />
                )}
                {viewMode === 'checklist' && (
                  <ChecklistView
                    process={selectedProcess}
                    onSelectStep={(step) => setSelectedStep(step)}
                    selectedStepId={selectedStep?.id ?? null}
                    onStepsChange={handleStepsChange}
                  />
                )}
                {viewMode === 'kanban' && (
                  <KanbanView
                    process={selectedProcess}
                    onSelectStep={(step) => setSelectedStep(step)}
                    selectedStepId={selectedStep?.id ?? null}
                    onStepsChange={handleStepsChange}
                  />
                )}
              </div>

              {/* 오른쪽: 단계 상세 */}
              {selectedStep && (
                <div className="w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <StepDetailPanel
                    key={selectedStep.id}
                    step={selectedStep}
                    onClose={() => setSelectedStep(null)}
                    onStepUpdated={handleStepUpdated}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 모달들 */}
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
            show(editingProcess?.id ? '프로세스가 수정되었습니다.' : '프로세스가 생성되었습니다.')
          }}
          onClose={() => { setShowProcessForm(false); setEditingProcess(undefined) }}
        />
      )}

      {showExecution && selectedProcess && (
        <ExecutionMode
          process={selectedProcess}
          onClose={() => { setShowExecution(false); show('실행이 기록되었습니다.') }}
        />
      )}

      {confirmModal && (
        <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
      )}

      {/* 토스트 */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div key={t.id} className={`w-72 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border-l-4 animate-in slide-in-from-right-5 duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${t.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'} text-gray-900 dark:text-white`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
