'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTask, toggleTaskDone, moveTaskToToday } from '@/app/actions/tasks'
import { toggleRoutineLog } from '@/app/actions/routines'
import TaskModal from './TaskModal'
import TaskDetailModal from './TaskDetailModal'
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
  categoryId?: number | null
  estimatedMinutes?: number | null
  checklist?: unknown
  projectName?: string | null
  goalName?: string | null
}

type Category = { id: number; name: string; color: string }
type Project = { id: number; title: string; color: string }
type Goal = { id: number; title: string; color: string }
type TodayRoutine = {
  id: number
  title: string
  description: string | null
  frequency: string
  timeOfDay: string | null
  color: string
  daysOfWeek: number[] | null
}

/* ─── 헬퍼 ─── */
function parseChecklist(raw: unknown): CheckItem[] {
  if (!Array.isArray(raw)) return []
  return raw as CheckItem[]
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function calcPriority(t: Task) {
  if (t.status === 'done') return { label: '완료', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' }
  if (t.importance === 'high' && t.urgency === 'high') return { label: '최우선', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
  if (t.importance === 'high') return { label: '계획필요', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
  if (t.urgency === 'high') return { label: '빠른처리', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' }
  return { label: '여유', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const STATUS_KO: Record<string, string> = {
  pending: '대기', in_progress: '진행 중', done: '완료', on_hold: '보류', cancelled: '취소',
}

type FilterKey = 'all' | 'pending' | 'in_progress' | 'done' | 'on_hold' | 'urgent' | 'due_soon'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'done', label: '완료' },
  { key: 'on_hold', label: '보류' },
  { key: 'urgent', label: '긴급' },
  { key: 'due_soon', label: '마감 임박' },
]

/* ─── 카드 컴포넌트 ─── */
function TaskCard({ task, onEdit, onDetail, onToggle, onDelete, onMoveToToday, showMoveToToday }: {
  task: Task
  onEdit: (t: Task) => void
  onDetail: (t: Task) => void
  onToggle: (id: number, isDone: boolean) => void
  onDelete: (id: number) => void
  onMoveToToday?: (id: number) => void
  showMoveToToday?: boolean
}) {
  const isDone = task.status === 'done'
  const priority = calcPriority(task)
  const checklist = parseChecklist(task.checklist)
  const doneItems = checklist.filter((i) => i.done).length
  const preview = task.description ? stripHtml(task.description) : ''
  const isWhite = !task.color || task.color === '#FFFFFF'

  return (
    <div
      className={`rounded-2xl border flex flex-col transition-all hover:shadow-md ${
        isWhite
          ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
          : 'border-transparent'
      } ${isDone ? 'opacity-75' : ''}`}
      style={!isWhite ? { backgroundColor: task.color } : {}}
    >
      {/* 상단 배지 + 마감시간 */}
      <div className="flex items-center gap-1.5 flex-wrap px-4 pt-4 pb-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[task.status]}`}>
          {STATUS_KO[task.status]}
        </span>
        {!isDone && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.cls}`}>
            {priority.label}
          </span>
        )}
        {task.dueTime && (
          <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
            </svg>
            {task.dueTime}
          </span>
        )}
      </div>

      {/* 제목 + 내용 */}
      <div className="px-4 pt-2.5 pb-0 flex-1 cursor-pointer" onClick={() => onDetail(task)}>
        <h3 className={`text-sm font-bold leading-snug mb-1.5 ${
          isDone
            ? 'line-through text-gray-400 dark:text-gray-500'
            : isWhite ? 'text-gray-900 dark:text-white' : 'text-gray-900'
        }`}>
          {task.title}
        </h3>
        {preview && !isDone && (
          <p className={`text-xs leading-relaxed line-clamp-2 ${
            isWhite ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600'
          }`}>{preview}</p>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="px-4 pt-2 pb-0 space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(task.taskDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
          {task.estimatedMinutes && (
            <span className="ml-2 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" />
              </svg>
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 ? `${task.estimatedMinutes % 60}m` : ''}`
                : `${task.estimatedMinutes}m`}
            </span>
          )}
        </div>

        {(task.projectName || task.goalName) && (
          <div className="flex items-center gap-2 flex-wrap">
            {task.projectName && (
              <span className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {task.projectName}
              </span>
            )}
            {task.goalName && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {task.goalName}
              </span>
            )}
          </div>
        )}

        {checklist.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${(doneItems / checklist.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 font-mono">
              {doneItems}/{checklist.length}
            </span>
          </div>
        )}
      </div>

      {/* 액션 바 - 항상 표시 */}
      <div className={`mt-3 mx-3 mb-3 flex items-center gap-1 rounded-xl px-2 py-2 ${
        isWhite ? 'bg-gray-50 dark:bg-gray-800' : 'bg-black/5'
      }`}>
        {/* 중요도·긴급도 점 */}
        <div className="flex items-center gap-1 mr-auto">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            task.importance === 'high' ? 'bg-red-400' :
            task.importance === 'medium' ? 'bg-blue-400' : 'bg-gray-300'
          }`} title={`중요도: ${task.importance === 'high' ? '높음' : task.importance === 'medium' ? '보통' : '낮음'}`} />
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            task.urgency === 'high' ? 'bg-orange-400' :
            task.urgency === 'medium' ? 'bg-yellow-400' : 'bg-gray-200'
          }`} title={`긴급도: ${task.urgency === 'high' ? '높음' : task.urgency === 'medium' ? '보통' : '낮음'}`} />
        </div>

        {/* 오늘로 이동 */}
        {showMoveToToday && !isDone && onMoveToToday && (
          <button
            onClick={() => onMoveToToday(task.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            오늘로
          </button>
        )}

        {/* 완료 버튼 (텍스트 표시) */}
        <button
          onClick={() => onToggle(task.id, isDone)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
            isDone
              ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {isDone ? '되돌리기' : '완료'}
        </button>

        {/* 수정 */}
        <button
          onClick={() => onEdit(task)}
          title="수정"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* 삭제 */}
        <button
          onClick={() => onDelete(task.id)}
          title="삭제"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

type Accent = 'blue' | 'violet' | 'emerald' | 'amber' | 'gray'

const ACCENT: Record<Accent, { bg: string; glow: string; strip: string; btn: string }> = {
  blue:    { bg: 'bg-blue-950 dark:bg-blue-950',    glow: '#3b82f6', strip: 'bg-blue-500',    btn: 'bg-blue-100 text-blue-950 hover:bg-blue-50' },
  violet:  { bg: 'bg-violet-950 dark:bg-violet-950',glow: '#8b5cf6', strip: 'bg-violet-500',  btn: 'bg-violet-100 text-violet-950 hover:bg-violet-50' },
  emerald: { bg: 'bg-emerald-950 dark:bg-emerald-950', glow: '#10b981', strip: 'bg-emerald-500', btn: 'bg-emerald-100 text-emerald-950 hover:bg-emerald-50' },
  amber:   { bg: 'bg-amber-950 dark:bg-amber-950',  glow: '#f59e0b', strip: 'bg-amber-500',   btn: 'bg-amber-100 text-amber-950 hover:bg-amber-50' },
  gray:    { bg: 'bg-gray-900 dark:bg-gray-800',    glow: '#6b7280', strip: 'bg-gray-500',    btn: 'bg-white text-gray-900 hover:bg-gray-100' },
}

/* ─── 메인 컴포넌트 ─── */
export default function TaskList({ tasks, defaultDate, title, description, categories = [], projects = [], goals = [], showMoveToToday = false, defaultFilter = 'all', accent = 'gray', todayRoutines, routineLogMap, todayDateStr }: {
  tasks: Task[]
  defaultDate?: string
  title: string
  description: string
  categories?: Category[]
  projects?: Project[]
  goals?: Goal[]
  showMoveToToday?: boolean
  defaultFilter?: FilterKey
  accent?: Accent
  todayRoutines?: TodayRoutine[]
  routineLogMap?: Record<number, boolean>
  todayDateStr?: string
}) {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<'card' | 'list'>('card')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>(defaultFilter)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = useMemo(() => {
    let list = [...tasks]

    if (filter === 'urgent') {
      list = list.filter((t) => t.importance === 'high' && t.urgency === 'high' && t.status !== 'done')
    } else if (filter === 'due_soon') {
      list = list.filter((t) => t.dueTime && t.status !== 'done')
    } else if (filter !== 'all') {
      list = list.filter((t) => t.status === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && stripHtml(t.description).toLowerCase().includes(q)) ||
          (t.projectName && t.projectName.toLowerCase().includes(q)) ||
          (t.goalName && t.goalName.toLowerCase().includes(q))
      )
    }

    return list
  }, [tasks, search, filter])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: tasks.length, pending: 0, in_progress: 0, done: 0, on_hold: 0, urgent: 0, due_soon: 0 }
    tasks.forEach((t) => {
      if (t.status === 'pending') c.pending++
      if (t.status === 'in_progress') c.in_progress++
      if (t.status === 'done') c.done++
      if (t.status === 'on_hold') c.on_hold++
      if (t.importance === 'high' && t.urgency === 'high' && t.status !== 'done') c.urgent++
      if (t.dueTime && t.status !== 'done') c.due_soon++
    })
    return c
  }, [tasks])

  function handleToggle(id: number, isDone: boolean) {
    startTransition(() => { toggleTaskDone(id, !isDone) })
  }
  function handleDelete(id: number) {
    if (!confirm('삭제하시겠습니까?')) return
    startTransition(() => { deleteTask(id) })
  }
  function handleMoveToToday(id: number) {
    startTransition(() => { moveTaskToToday(id) })
  }
  function handleAddClose() { setShowAdd(false); router.refresh() }
  function handleEditClose() { setEditTask(null); router.refresh() }
  function openEdit(t: Task) { setDetailTask(null); setEditTask(t) }
  function handleRoutineToggle(routineId: number, isDone: boolean) {
    if (!todayDateStr) return
    startTransition(() => { toggleRoutineLog(routineId, todayDateStr, isDone) })
  }

  return (
    <div>
      {/* 배너 */}
      <div className={`relative ${ACCENT[accent].bg} rounded-2xl mb-6 overflow-hidden`}>
        {/* 상단 컬러 스트립 */}
        <div className={`h-1 ${ACCENT[accent].strip}`} />
        <div className="px-7 py-6">
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${ACCENT[accent].glow} 0%, transparent 60%)` }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white mb-0.5">{title}</h1>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg ${ACCENT[accent].btn}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            할일 추가
          </button>
        </div>
        </div>
      </div>

      {/* 필터 탭 + 검색 + 뷰 */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === key
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900'
                    : key === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                    : key === 'done' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 내용, 프로젝트 검색..."
              className="flex-1 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none bg-transparent" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
              <button onClick={() => setView('card')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium text-gray-400 mb-2">
            {search ? '검색 결과가 없습니다' : filter !== 'all' ? `${FILTERS.find(f => f.key === filter)?.label} 항목이 없습니다` : '할일이 없습니다'}
          </p>
          {!search && filter === 'all' && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-blue-500 hover:underline font-medium">
              + 첫 번째 할일 추가하기
            </button>
          )}
        </div>
      )}

      {/* 카드 뷰 */}
      {view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t}
              onEdit={openEdit}
              onDetail={(t) => setDetailTask(t)}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onMoveToToday={handleMoveToToday}
              showMoveToToday={showMoveToToday}
            />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {filtered.map((t, i) => {
            const checklist = parseChecklist(t.checklist)
            const doneItems = checklist.filter((c) => c.done).length
            const isDone = t.status === 'done'
            return (
              <div key={t.id}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                } ${isDone ? 'opacity-70' : ''}`}
              >
                {/* 완료 토글 원형 */}
                <button
                  onClick={() => handleToggle(t.id, isDone)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                  }`}
                  title={isDone ? '미완료로 변경' : '완료 처리'}
                >
                  {isDone && (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* 우선순위 점 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.importance === 'high' ? 'bg-red-400' : t.importance === 'medium' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${t.urgency === 'high' ? 'bg-orange-400' : t.urgency === 'medium' ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                </div>

                {/* 제목 + 메타 */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTask(t)}>
                  <p className={`text-sm font-semibold truncate ${
                    isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'
                  }`}>{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.projectName && <span className="text-[10px] text-violet-500 dark:text-violet-400">📁 {t.projectName}</span>}
                    {t.goalName && <span className="text-[10px] text-blue-500 dark:text-blue-400">🎯 {t.goalName}</span>}
                    {checklist.length > 0 && <span className="text-[10px] text-gray-400 font-mono">☑ {doneItems}/{checklist.length}</span>}
                  </div>
                </div>

                {/* 배지 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_BADGE[t.status]}`}>
                    {STATUS_KO[t.status]}
                  </span>
                  {t.dueTime && <span className="text-[10px] text-gray-400 font-mono">{t.dueTime}</span>}
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {showMoveToToday && !isDone && (
                    <button onClick={() => handleMoveToToday(t.id)}
                      className="px-2 py-1 text-[10px] font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      오늘로
                    </button>
                  )}
                  <button onClick={() => openEdit(t)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 오늘 루틴 섹션 */}
      {todayRoutines && todayRoutines.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">오늘 루틴</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold">
              {todayRoutines.filter((r) => routineLogMap?.[r.id]).length}/{todayRoutines.length}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {todayRoutines.map((r, i) => {
              const isDone = routineLogMap?.[r.id] ?? false
              const freqLabel = r.frequency === 'daily' ? '매일' : r.frequency === 'weekly' ? '매주' : '매월'
              return (
                <div key={r.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${isDone ? 'opacity-70' : ''}`}>
                  <button
                    onClick={() => handleRoutineToggle(r.id, isDone)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                    }`}
                    title={isDone ? '미완료로 변경' : '완료 처리'}
                  >
                    {isDone && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {r.title}
                    </p>
                    {r.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{r.description}</p>
                    )}
                  </div>
                  {r.timeOfDay && (
                    <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{r.timeOfDay}</span>
                  )}
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">
                    {freqLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAdd && <TaskModal defaultDate={defaultDate} onClose={handleAddClose} categories={categories} projects={projects} goals={goals} />}
      {editTask && <TaskModal task={editTask} onClose={handleEditClose} categories={categories} projects={projects} goals={goals} />}
      {detailTask && (
        <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} onEdit={() => openEdit(detailTask)} />
      )}
    </div>
  )
}
