'use client'

import { useActionState, useEffect, useState } from 'react'
import { createTask, updateTask } from '@/app/actions/tasks'
import EditorWithAttachments from '@/components/editor/EditorWithAttachments'
import ChecklistInput, { type CheckItem } from './ChecklistInput'

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
  categoryId?: number | null
  estimatedMinutes?: number | null
  checklist?: unknown
  projectName?: string | null
  goalName?: string | null
  projectId?: number | null
  goalId?: number | null
}

type Category = { id: number; name: string; color: string }
type Project = { id: number; title: string; color: string }
type Goal = { id: number; title: string; color: string }

type Props = {
  onClose: () => void
  task?: Task
  defaultDate?: string
  categories?: Category[]
  projects?: Project[]
  goals?: Goal[]
}

/* ─── 우선순위 자동 계산 ─── */
function calcPriority(importance: string, urgency: string) {
  if (importance === 'high' && urgency === 'high')
    return { label: '최우선', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
  if (importance === 'high')
    return { label: '계획 필요', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  if (urgency === 'high')
    return { label: '빠른 처리', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' }
  return { label: '여유 작업', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }
}

const COLORS = [
  { value: '#FFFFFF', label: '기본', textCls: 'text-gray-400' },
  { value: '#FEE2E2', label: '빨강', textCls: 'text-red-400' },
  { value: '#FFEDD5', label: '주황', textCls: 'text-orange-400' },
  { value: '#FEF9C3', label: '노랑', textCls: 'text-yellow-500' },
  { value: '#DCFCE7', label: '초록', textCls: 'text-emerald-500' },
  { value: '#DBEAFE', label: '파랑', textCls: 'text-blue-400' },
  { value: '#F3E8FF', label: '보라', textCls: 'text-purple-400' },
]

const ESTIMATED_OPTIONS = [
  { value: 15, label: '15분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
  { value: 180, label: '3시간' },
  { value: 240, label: '4시간 이상' },
]

const statusLabels: Record<string, string> = {
  pending: '대기', in_progress: '진행 중', done: '완료', on_hold: '보류', cancelled: '취소',
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors'
const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
        <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        {title}
        <span className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      </p>
      {children}
    </div>
  )
}

export default function TaskModal({ onClose, task, defaultDate, categories = [], projects = [], goals = [] }: Props) {
  const action = task ? updateTask : createTask
  const [state, formAction, pending] = useActionState(action, undefined)

  const [importance, setImportance] = useState(task?.importance ?? 'medium')
  const [urgency, setUrgency] = useState(task?.urgency ?? 'medium')
  const [selectedColor, setSelectedColor] = useState(task?.color ?? '#FFFFFF')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(String(task?.projectId ?? ''))
  const [selectedGoalId, setSelectedGoalId] = useState<string>(String(task?.goalId ?? ''))
  const [projectNameVal, setProjectNameVal] = useState(task?.projectName ?? '')
  const [goalNameVal, setGoalNameVal] = useState(task?.goalName ?? '')

  const priority = calcPriority(importance, urgency)

  const checklist = (() => {
    if (!task?.checklist) return []
    try {
      return Array.isArray(task.checklist) ? (task.checklist as CheckItem[]) : []
    } catch { return [] }
  })()

  useEffect(() => {
    if (state && 'success' in state) onClose()
  }, [state, onClose])

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const dateValue = task
    ? new Date(task.taskDate).toISOString().split('T')[0]
    : (defaultDate ?? new Date().toISOString().split('T')[0])

  const errors = state && 'errors' in state ? state.errors : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {task ? '할일 수정' : '새 할일 추가'}
            </h2>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto">
          <form id="task-form" action={formAction} className="p-6 space-y-6">
            {task && <input type="hidden" name="id" value={task.id} />}

            {errors?.general && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">
                {errors.general[0]}
              </p>
            )}

            {/* ── 기본 정보 ── */}
            <Section title="기본 정보">
              <div>
                <label className={labelCls}>제목 *</label>
                <input name="title" required defaultValue={task?.title}
                  className={inputCls} placeholder="할일 제목을 입력하세요" />
                {errors?.title && <p className="mt-1 text-xs text-red-500">{errors.title[0]}</p>}
              </div>

              <div>
                <label className={labelCls}>내용</label>
                <EditorWithAttachments
                  name="description"
                  entityType="task"
                  entityId={task?.id}
                  defaultValue={task?.description ?? ''}
                  placeholder="내용 입력"
                />
              </div>
            </Section>

            {/* ── 분류 / 연결 ── */}
            <Section title="분류 / 연결">
              {/* hidden fields submitted with form */}
              <input type="hidden" name="projectId" value={selectedProjectId} />
              <input type="hidden" name="goalId" value={selectedGoalId} />
              <input type="hidden" name="projectName" value={projectNameVal} />
              <input type="hidden" name="goalName" value={goalNameVal} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>목표</label>
                  {goals.length > 0 ? (
                    <select
                      className={inputCls}
                      value={selectedGoalId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedGoalId(id)
                        setGoalNameVal(goals.find((g) => String(g.id) === id)?.title ?? '')
                      }}
                    >
                      <option value="">목표 없음</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputCls}
                      placeholder="연결할 목표"
                      value={goalNameVal}
                      onChange={(e) => setGoalNameVal(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className={labelCls}>프로젝트</label>
                  {projects.length > 0 ? (
                    <select
                      className={inputCls}
                      value={selectedProjectId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedProjectId(id)
                        setProjectNameVal(projects.find((p) => String(p.id) === id)?.title ?? '')
                      }}
                    >
                      <option value="">프로젝트 없음</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputCls}
                      placeholder="연결할 프로젝트"
                      value={projectNameVal}
                      onChange={(e) => setProjectNameVal(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <label className={labelCls}>카테고리</label>
                  <select name="categoryId" defaultValue={task?.categoryId ?? ''} className={inputCls}>
                    <option value="">카테고리 없음</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </Section>

            {/* ── 날짜 / 시간 ── */}
            <Section title="날짜 / 시간">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>날짜 *</label>
                  <input name="taskDate" type="date" required defaultValue={dateValue} className={inputCls} />
                  {errors?.taskDate && <p className="mt-1 text-xs text-red-500">{errors.taskDate[0]}</p>}
                </div>
                <div>
                  <label className={labelCls}>마감 시간</label>
                  <input name="dueTime" type="time" defaultValue={task?.dueTime ?? ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>예상 소요</label>
                  <select name="estimatedMinutes" defaultValue={task?.estimatedMinutes ?? ''} className={inputCls}>
                    <option value="">미설정</option>
                    {ESTIMATED_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 반복 설정 (준비 중) */}
              <div>
                <label className={labelCls}>반복 설정</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs text-gray-400">반복 설정 - 준비 중 (2단계)</span>
                </div>
              </div>
            </Section>

            {/* ── 우선순위 ── */}
            <Section title="우선순위">
              {/* 자동 우선순위 미리보기 */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-400">자동 우선순위:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${priority.cls}`}>
                  {priority.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>중요도</label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                    {(['high', 'medium', 'low'] as const).map((v) => (
                      <label key={v} className="flex-1">
                        <input type="radio" name="importance" value={v}
                          checked={importance === v}
                          onChange={() => setImportance(v)}
                          className="sr-only" />
                        <span className={`flex items-center justify-center py-2 text-xs font-semibold cursor-pointer transition-colors ${
                          importance === v
                            ? v === 'high' ? 'bg-red-500 text-white' : v === 'medium' ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}>
                          {v === 'high' ? '높음' : v === 'medium' ? '보통' : '낮음'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>긴급도</label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                    {(['high', 'medium', 'low'] as const).map((v) => (
                      <label key={v} className="flex-1">
                        <input type="radio" name="urgency" value={v}
                          checked={urgency === v}
                          onChange={() => setUrgency(v)}
                          className="sr-only" />
                        <span className={`flex items-center justify-center py-2 text-xs font-semibold cursor-pointer transition-colors ${
                          urgency === v
                            ? v === 'high' ? 'bg-red-500 text-white' : v === 'medium' ? 'bg-orange-500 text-white' : 'bg-gray-400 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}>
                          {v === 'high' ? '높음' : v === 'medium' ? '보통' : '낮음'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {task && (
                <div>
                  <label className={labelCls}>상태</label>
                  <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <label key={v} className="flex-1">
                        <input type="radio" name="status" value={v}
                          defaultChecked={task.status === v}
                          className="sr-only" />
                        <span className={`flex items-center justify-center py-2 text-[11px] font-semibold cursor-pointer transition-colors peer-checked:bg-blue-500 peer-checked:text-white text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 [input:checked+&]:${
                          v === 'done' ? 'bg-emerald-500' :
                          v === 'in_progress' ? 'bg-blue-500' :
                          v === 'on_hold' ? 'bg-orange-500' :
                          v === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'
                        } [input:checked+&]:text-white`}>
                          {l}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ── 체크리스트 ── */}
            <Section title="체크리스트">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                <ChecklistInput defaultValue={checklist} />
              </div>
            </Section>

            {/* ── 카드 색상 ── */}
            <Section title="카드 색상">
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(({ value, label, textCls }) => (
                  <label key={value} className="cursor-pointer" title={label}>
                    <input type="radio" name="color" value={value}
                      checked={selectedColor === value}
                      onChange={() => setSelectedColor(value)}
                      className="sr-only" />
                    <div className={`flex flex-col items-center gap-1 transition-all ${selectedColor === value ? 'scale-110' : ''}`}>
                      <span
                        className={`block w-9 h-9 rounded-xl border-2 transition-all shadow-sm ${
                          selectedColor === value
                            ? 'border-gray-700 dark:border-gray-200 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: value }}
                      />
                      <span className={`text-[9px] font-medium ${textCls}`}>{label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

          </form>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            취소
          </button>
          <button type="submit" form="task-form" disabled={pending}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {pending ? '저장 중...' : task ? '수정 완료' : '할일 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
