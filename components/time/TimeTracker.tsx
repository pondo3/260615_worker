'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { startTimer, stopTimer, cancelTimer, saveCompletedSession, deleteTimeEntry, updateTimeEntry } from '@/app/actions/time'

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Task = { id: number; title: string; taskDate: string; status: string }
type Project = { id: number; title: string; color: string }
type Category = { id: number; name: string; color: string }

type EntryRelation = { title: string } | null
type EntryCategory = { name: string; color: string } | null

type TimeEntry = {
  id: number
  title: string
  startedAt: string
  endedAt: string | null
  durationMin: number | null
  entryType: string
  memo: string | null
  taskId: number | null
  projectId: number | null
  categoryId: number | null
  task: EntryRelation
  project: EntryRelation
  category: EntryCategory
}

type Props = {
  activeEntry: TimeEntry | null
  todayEntries: TimeEntry[]
  tasks: Task[]
  projects: Project[]
  categories: Category[]
  selectedDate: string
  isToday: boolean
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const POM_WORK = 25 * 60
const POM_SHORT_BREAK = 5 * 60
const POM_LONG_BREAK = 20 * 60

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDuration(min: number | null): string {
  if (!min) return '—'
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}

function totalToday(entries: TimeEntry[]): number {
  return entries.reduce((acc, e) => acc + (e.durationMin ?? 0), 0)
}

// ── 타입 배지 ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    work: { label: '작업', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    pomodoro: { label: '🍅 포모', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    short_break: { label: '휴식', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    long_break: { label: '긴 휴식', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  }
  const info = map[type] ?? map.work
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${info.cls}`}>{info.label}</span>
}

// ── 선택기 ────────────────────────────────────────────────────────────────────

function Selector({
  label, value, onChange, options, placeholder, color,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  color?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={value && color ? { borderColor: color + '80' } : {}}
        className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── 기록 편집 모달 ────────────────────────────────────────────────────────────

function EditModal({
  entry, tasks, projects, categories, onClose,
}: {
  entry: TimeEntry
  tasks: Task[]
  projects: Project[]
  categories: Category[]
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(entry.title)
  const [memo, setMemo] = useState(entry.memo ?? '')
  const [taskId, setTaskId] = useState(String(entry.taskId ?? ''))
  const [projectId, setProjectId] = useState(String(entry.projectId ?? ''))
  const [categoryId, setCategoryId] = useState(String(entry.categoryId ?? ''))
  const [startTime, setStartTime] = useState(fmtTime(entry.startedAt))
  const [endTime, setEndTime] = useState(entry.endedAt ? fmtTime(entry.endedAt) : '')
  const [saving, setSaving] = useState(false)

  function toDateIso(base: string, hhmm: string): string {
    const d = new Date(base)
    const [h, m] = hhmm.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  async function handleSave() {
    setSaving(true)
    await updateTimeEntry(entry.id, {
      title: title.trim() || entry.title,
      memo: memo.trim() || undefined,
      taskId: taskId ? Number(taskId) : null,
      projectId: projectId ? Number(projectId) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      startedAt: startTime ? toDateIso(entry.startedAt, startTime) : undefined,
      endedAt: endTime ? toDateIso(entry.startedAt, endTime) : undefined,
    })
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">기록 편집</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">시작</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">종료</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">할 일 연결</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)}
              className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400">
              <option value="">선택 안 함</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">프로젝트</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400">
                <option value="">선택 안 함</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">카테고리</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400">
                <option value="">선택 안 함</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">메모</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
              className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 resize-none" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 기록 카드 ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry, tasks, projects, categories,
}: {
  entry: TimeEntry
  tasks: Task[]
  projects: Project[]
  categories: Category[]
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteTimeEntry(entry.id)
    router.refresh()
  }

  return (
    <>
      {editOpen && (
        <EditModal entry={entry} tasks={tasks} projects={projects} categories={categories} onClose={() => setEditOpen(false)} />
      )}
      <div className={`flex items-center gap-3 py-2.5 px-1 group ${deleting ? 'opacity-40' : ''}`}>
        {/* 타임라인 도트 */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-10 text-right">
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{fmtTime(entry.startedAt)}</span>
          {entry.endedAt && <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{fmtTime(entry.endedAt)}</span>}
        </div>

        <div className="flex-shrink-0 w-px h-8 bg-gray-200 dark:bg-gray-700 relative">
          <span className="absolute top-1/2 -translate-y-1/2 -left-[3px] w-1.5 h-1.5 rounded-full bg-teal-400" />
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TypeBadge type={entry.entryType} />
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {entry.project && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{entry.project.title}</span>
            )}
            {entry.category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: entry.category.color + '20', color: entry.category.color }}
              >{entry.category.name}</span>
            )}
          </div>
        </div>

        {/* 시간 */}
        <span className="text-sm font-bold text-teal-600 dark:text-teal-400 flex-shrink-0 tabular-nums">
          {fmtDuration(entry.durationMin)}
        </span>

        {/* 액션 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold">삭제</button>
              <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px]">취소</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function TimeTracker({ activeEntry, todayEntries, tasks, projects, categories, selectedDate, isToday }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'normal' | 'pomodoro'>('normal')
  const [mounted, setMounted] = useState(false)

  // 일반 타이머
  const [elapsed, setElapsed] = useState(0)
  const [isPending, setIsPending] = useState(false)

  // 포모도로
  const [pomPhase, setPomPhase] = useState<'work' | 'short_break' | 'long_break'>('work')
  const [pomCount, setPomCount] = useState(0)
  const [pomSecondsLeft, setPomSecondsLeft] = useState(POM_WORK)
  const [pomRunning, setPomRunning] = useState(false)
  const pomStartRef = useRef<Date | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // 폼
  const [title, setTitle] = useState('')
  const [selTaskId, setSelTaskId] = useState('')
  const [selProjectId, setSelProjectId] = useState('')
  const [selCategoryId, setSelCategoryId] = useState('')

  useEffect(() => { setMounted(true) }, [])

  // 일반 타이머 tick
  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0)
      return
    }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(activeEntry.startedAt).getTime()) / 1000)
      setElapsed(Math.max(diff, 0))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [activeEntry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 포모도로 tick
  useEffect(() => {
    if (!pomRunning) return
    const id = setInterval(() => {
      setPomSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          handlePomComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [pomRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  function playBeep() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.8)
    } catch {}
  }

  const handlePomComplete = useCallback(async () => {
    playBeep()
    const endedAt = new Date()
    const startedAt = pomStartRef.current ?? new Date(Date.now() - POM_WORK * 1000)

    if (pomPhase === 'work') {
      const durationMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
      await saveCompletedSession({
        title: title || (tasks.find((t) => t.id === Number(selTaskId))?.title ?? '포모도로 작업'),
        taskId: selTaskId ? Number(selTaskId) : null,
        projectId: selProjectId ? Number(selProjectId) : null,
        categoryId: selCategoryId ? Number(selCategoryId) : null,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMin,
        entryType: 'pomodoro',
      })
      router.refresh()

      const newCount = pomCount + 1
      setPomCount(newCount)
      const nextPhase = newCount % 4 === 0 ? 'long_break' : 'short_break'
      setPomPhase(nextPhase)
      setPomSecondsLeft(nextPhase === 'long_break' ? POM_LONG_BREAK : POM_SHORT_BREAK)
    } else {
      setPomPhase('work')
      setPomSecondsLeft(POM_WORK)
    }
    setPomRunning(false)
    pomStartRef.current = null
  }, [pomPhase, pomCount, title, selTaskId, selProjectId, selCategoryId, tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  function startPom() {
    pomStartRef.current = new Date()
    setPomRunning(true)
  }

  function pausePom() {
    setPomRunning(false)
  }

  function skipPom() {
    setPomRunning(false)
    if (pomPhase === 'work') {
      const newCount = pomCount + 1
      setPomCount(newCount)
      const nextPhase = newCount % 4 === 0 ? 'long_break' : 'short_break'
      setPomPhase(nextPhase)
      setPomSecondsLeft(nextPhase === 'long_break' ? POM_LONG_BREAK : POM_SHORT_BREAK)
    } else {
      setPomPhase('work')
      setPomSecondsLeft(POM_WORK)
    }
    pomStartRef.current = null
  }

  function resetPom() {
    setPomRunning(false)
    setPomPhase('work')
    setPomCount(0)
    setPomSecondsLeft(POM_WORK)
    pomStartRef.current = null
  }

  async function handleStart() {
    setIsPending(true)
    const selectedTask = tasks.find((t) => t.id === Number(selTaskId))
    await startTimer({
      title: title.trim() || selectedTask?.title || '작업',
      taskId: selTaskId ? Number(selTaskId) : null,
      projectId: selProjectId ? Number(selProjectId) : null,
      categoryId: selCategoryId ? Number(selCategoryId) : null,
      entryType: 'work',
    })
    router.refresh()
    setIsPending(false)
  }

  async function handleStop() {
    if (!activeEntry) return
    setIsPending(true)
    await stopTimer(activeEntry.id)
    router.refresh()
    setIsPending(false)
  }

  async function handleCancel() {
    if (!activeEntry) return
    setIsPending(true)
    await cancelTimer(activeEntry.id)
    router.refresh()
    setIsPending(false)
  }

  const isActive = !!activeEntry
  const todayTotal = totalToday(todayEntries)

  function navigateDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    const iso = d.toISOString().split('T')[0]
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d > today) return
    if (iso === today.toISOString().split('T')[0]) {
      router.push('/time')
    } else {
      router.push(`/time?date=${iso}`)
    }
  }

  const dateLabel = (() => {
    const d = new Date(selectedDate)
    if (isToday) return '오늘'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    if (d.toDateString() === yesterday.toDateString()) return '어제'
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  })()

  // 선택된 task 이름
  const selectedTaskName = tasks.find((t) => t.id === Number(selTaskId))?.title
  const selectedProject = projects.find((p) => p.id === Number(selProjectId))
  const selectedCategory = categories.find((c) => c.id === Number(selCategoryId))

  const pomPhaseLabel = pomPhase === 'work' ? '작업' : pomPhase === 'short_break' ? '짧은 휴식' : '긴 휴식'
  const pomPhaseColor = pomPhase === 'work' ? 'text-red-500' : 'text-emerald-500'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">시간 관리</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              오늘 총 <span className="font-bold text-teal-600 dark:text-teal-400">{fmtDuration(todayTotal)}</span> 기록됨
            </p>
          </div>
          {/* 모드 탭 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode('normal')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'normal'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              일반
            </button>
            <button
              onClick={() => { setMode('pomodoro'); if (isActive) handleStop() }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'pomodoro'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              🍅 포모도로
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl space-y-6">

        {/* ── 타이머 패널 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

          {mode === 'normal' ? (
            /* 일반 타이머 */
            <div className="p-6 text-center">
              {/* 상태 표시 */}
              {isActive && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">기록 중</span>
                  {activeEntry?.task && <span className="text-xs text-gray-400">— {activeEntry.task.title}</span>}
                </div>
              )}

              {/* 타이머 숫자 */}
              <div className={`font-mono font-black tabular-nums mb-6 transition-colors ${
                isActive ? 'text-5xl text-teal-600 dark:text-teal-400' : 'text-5xl text-gray-300 dark:text-gray-600'
              }`}>
                {mounted ? fmtSeconds(elapsed) : '00:00:00'}
              </div>

              {/* 연결 선택기 */}
              {!isActive && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-left">
                  <Selector
                    label="할 일"
                    value={selTaskId}
                    onChange={(v) => {
                      setSelTaskId(v)
                      if (v && !title) {
                        const t = tasks.find((t) => t.id === Number(v))
                        if (t) setTitle(t.title)
                      }
                    }}
                    options={tasks.map((t) => ({ value: String(t.id), label: t.title }))}
                    placeholder="선택 안 함"
                  />
                  <Selector
                    label="프로젝트"
                    value={selProjectId}
                    onChange={setSelProjectId}
                    options={projects.map((p) => ({ value: String(p.id), label: p.title }))}
                    placeholder="선택 안 함"
                    color={selectedProject?.color}
                  />
                  <Selector
                    label="카테고리"
                    value={selCategoryId}
                    onChange={setSelCategoryId}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder="선택 안 함"
                    color={selectedCategory?.color}
                  />
                </div>
              )}

              {/* 제목 입력 (비활성 시) */}
              {!isActive && (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedTaskName ?? '작업 이름 입력 (선택)'}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-teal-400 transition-colors mb-5"
                />
              )}

              {/* 버튼 */}
              {!isActive ? (
                <button
                  onClick={handleStart}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  시작
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleStop}
                    disabled={isPending}
                    className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    정지
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 포모도로 */
            <div className="p-6 text-center">
              {/* 진행 도트 */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i < pomCount % 4
                        ? 'bg-red-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
                {pomCount > 0 && (
                  <span className="ml-2 text-xs text-gray-400">세션 {pomCount}회 완료</span>
                )}
              </div>

              {/* 단계 표시 */}
              <p className={`text-sm font-bold mb-2 ${pomPhaseColor}`}>{pomPhaseLabel}</p>

              {/* 카운트다운 */}
              <div className={`font-mono font-black tabular-nums text-5xl mb-2 transition-colors ${
                pomRunning
                  ? pomPhase === 'work' ? 'text-red-500' : 'text-emerald-500'
                  : 'text-gray-300 dark:text-gray-600'
              }`}>
                {mounted ? fmtSeconds(pomSecondsLeft) : '25:00'}
              </div>

              {/* 프로그레스 바 */}
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-6 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    pomPhase === 'work' ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                  style={{
                    width: `${
                      (1 - pomSecondsLeft / (pomPhase === 'work' ? POM_WORK : pomPhase === 'short_break' ? POM_SHORT_BREAK : POM_LONG_BREAK)) * 100
                    }%`,
                  }}
                />
              </div>

              {/* 작업 선택 */}
              {pomPhase === 'work' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-left">
                  <Selector
                    label="할 일"
                    value={selTaskId}
                    onChange={(v) => {
                      setSelTaskId(v)
                      if (v && !title) {
                        const t = tasks.find((t) => t.id === Number(v))
                        if (t) setTitle(t.title)
                      }
                    }}
                    options={tasks.map((t) => ({ value: String(t.id), label: t.title }))}
                    placeholder="선택 안 함"
                  />
                  <Selector
                    label="프로젝트"
                    value={selProjectId}
                    onChange={setSelProjectId}
                    options={projects.map((p) => ({ value: String(p.id), label: p.title }))}
                    placeholder="선택 안 함"
                    color={selectedProject?.color}
                  />
                  <Selector
                    label="카테고리"
                    value={selCategoryId}
                    onChange={setSelCategoryId}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder="선택 안 함"
                    color={selectedCategory?.color}
                  />
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3">
                {!pomRunning ? (
                  <button onClick={startPom}
                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                      pomPhase === 'work' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    {pomSecondsLeft === (pomPhase === 'work' ? POM_WORK : pomPhase === 'short_break' ? POM_SHORT_BREAK : POM_LONG_BREAK)
                      ? '시작' : '재개'}
                  </button>
                ) : (
                  <button onClick={pausePom}
                    className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    일시정지
                  </button>
                )}
                <button onClick={skipPom} title="건너뛰기"
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
                <button onClick={resetPom} title="초기화"
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 날짜별 기록 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{dateLabel} 기록</h2>
              <button
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-gray-400">{todayEntries.length}건 · 총 {fmtDuration(todayTotal)}</span>
          </div>

          {todayEntries.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.5} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3" /></svg>
              아직 기록이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {todayEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} tasks={tasks} projects={projects} categories={categories} />
              ))}
            </div>
          )}

          {/* 프로젝트별 요약 */}
          {todayEntries.length > 0 && (() => {
            const byProject: Record<string, number> = {}
            todayEntries.forEach((e) => {
              const key = e.project?.title ?? '미분류'
              byProject[key] = (byProject[key] ?? 0) + (e.durationMin ?? 0)
            })
            const entries = Object.entries(byProject).sort((a, b) => b[1] - a[1])
            return (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">프로젝트별</p>
                <div className="space-y-1.5">
                  {entries.map(([name, min]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{name}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(min / todayTotal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0 w-14 text-right tabular-nums">{fmtDuration(min)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
