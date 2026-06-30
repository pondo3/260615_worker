'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TimeBlockWithRefs } from '@/app/actions/timeblocks'
import { toggleTimeBlockDone, deleteTimeBlock } from '@/app/actions/timeblocks'
import { calcDurationMin } from '@/lib/timeUtils'
import TodayView from '@/components/time/TodayView'
import WeekView from '@/components/time/WeekView'
import TimeBlockModal from '@/components/time/TimeBlockModal'
import RightPanel from '@/components/time/RightPanel'

type View = 'today' | 'week' | 'list'

type Task = { id: number; title: string; importance: string; dueTime: string | null; estimatedMinutes: number | null }
type Routine = { id: number; title: string; timeOfDay: string | null; frequency: string; daysOfWeek: unknown; color: string }
type Project = { id: number; title: string; color: string }

type Props = {
  initialDate: string
  initialView: View
  timeBlocks: TimeBlockWithRefs[]
  weekBlocks: TimeBlockWithRefs[]
  weekStart: string
  todayTasks: Task[]
  todayRoutines: Routine[]
  doneRoutineIds: number[]
  projects: Project[]
}

const VIEW_LABELS: Record<View, string> = {
  today: '오늘',
  week: '이번 주',
  list: '리스트',
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function computeStats(blocks: TimeBlockWithRefs[]): {
  plannedMin: number
  doneMin: number
  focusMin: number
  nextBlock: TimeBlockWithRefs | null
} {
  const now = new Date()
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  let plannedMin = 0
  let doneMin = 0
  let focusMin = 0
  let nextBlock: TimeBlockWithRefs | null = null

  for (const b of blocks) {
    const dur = calcDurationMin(b.startTime, b.endTime)
    plannedMin += dur
    if (b.status === 'done') doneMin += dur
    if (b.status === 'done' && !['휴식', '개인'].includes(b.blockType)) focusMin += dur
    if (b.startTime > nowStr && nextBlock === null) nextBlock = b
  }

  return { plannedMin, doneMin, focusMin, nextBlock }
}

function fmtMin(min: number): string {
  if (min <= 0) return '0분'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

export default function TimeManagementClient({
  initialDate,
  initialView,
  timeBlocks,
  weekBlocks,
  weekStart,
  todayTasks,
  todayRoutines,
  doneRoutineIds,
  projects,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [view, setView] = useState<View>(initialView)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlockWithRefs | null>(null)
  const [defaultTime, setDefaultTime] = useState<{ startTime: string; endTime: string } | null>(null)
  const [defaultValues, setDefaultValues] = useState<{ title?: string; taskId?: number; routineId?: number; blockType?: string } | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = initialDate

  const navigate = useCallback((newDate: string, newView?: View) => {
    const params = new URLSearchParams()
    params.set('date', newDate)
    if (newView) params.set('view', newView)
    else if (view !== 'today') params.set('view', view)
    startTransition(() => router.push(`/time?${params.toString()}`))
  }, [router, view])

  const openCreate = useCallback((
    time?: { startTime: string; endTime: string },
    values?: { title?: string; taskId?: number; routineId?: number; blockType?: string }
  ) => {
    setEditingBlock(null)
    setDefaultTime(time ?? null)
    setDefaultValues(values ?? null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((block: TimeBlockWithRefs) => {
    setEditingBlock(block)
    setDefaultTime(null)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingBlock(null)
    setDefaultTime(null)
    setDefaultValues(null)
  }, [])

  const refresh = useCallback(() => {
    startTransition(() => router.refresh())
  }, [router])

  const stats = computeStats(timeBlocks)
  const remainingMin = Math.max(0, stats.plannedMin - stats.doneMin)

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-950">
      {/* ── 상단 헤더 ── */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">시간 관리</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">하루와 주간 시간을 계획하고 실행합니다</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 날짜 네비게이션 */}
            <button
              onClick={() => navigate(shiftDate(selectedDate, -1))}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
              {fmtDate(selectedDate)}
            </span>
            <button
              onClick={() => navigate(shiftDate(selectedDate, 1))}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {selectedDate !== today && (
              <button
                onClick={() => navigate(today)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                오늘
              </button>
            )}
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              시간 블록 추가
            </button>
          </div>
        </div>

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard
            icon="📅" label="오늘 계획 시간"
            value={fmtMin(stats.plannedMin)}
            sub={`${timeBlocks.length}개 블록`}
            color="blue"
          />
          <StatCard
            icon="✅" label="완료 시간"
            value={fmtMin(stats.doneMin)}
            sub={stats.plannedMin > 0 ? `${Math.round((stats.doneMin / stats.plannedMin) * 100)}%` : '—'}
            color="green"
          />
          <StatCard
            icon="⏳" label="남은 시간"
            value={fmtMin(remainingMin)}
            sub={stats.nextBlock ? `다음: ${stats.nextBlock.startTime}` : '완료'}
            color="amber"
          />
          <StatCard
            icon="🎯" label="집중 시간"
            value={fmtMin(stats.focusMin)}
            sub={stats.plannedMin > 0 ? `집중률 ${Math.round((stats.focusMin / stats.plannedMin) * 100)}%` : '—'}
            color="violet"
          />
        </div>

        {/* 뷰 탭 */}
        <div className="flex items-center gap-1">
          {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v)
                navigate(selectedDate, v)
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                view === v
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 좌/중앙 뷰 영역 */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {view === 'today' && (
            <TodayView
              date={selectedDate}
              blocks={timeBlocks}
              weekBlocks={weekBlocks}
              weekStart={weekStart}
              onEdit={openEdit}
              onCreateAt={openCreate}
              onRefresh={refresh}
            />
          )}
          {view === 'week' && (
            <WeekView
              weekStart={weekStart}
              blocks={weekBlocks}
              selectedDate={selectedDate}
              onEdit={openEdit}
              onSelectDate={(d) => navigate(d, 'today')}
              onCreateAt={(date, time) => {
                navigate(date, 'today')
                setTimeout(() => openCreate(time), 300)
              }}
            />
          )}
          {view === 'list' && (
            <ListView
              blocks={timeBlocks}
              onEdit={openEdit}
              onRefresh={refresh}
            />
          )}
        </div>

        {/* 오른쪽 패널 */}
        <RightPanel
          tasks={todayTasks}
          routines={todayRoutines}
          doneRoutineIds={doneRoutineIds}
          projects={projects}
          scheduledBlockTaskIds={timeBlocks.map((b) => b.taskId).filter(Boolean) as number[]}
          onScheduleTask={(task) => {
            const nowH = new Date().getHours()
            const startH = Math.max(nowH, 8)
            const startTime = `${String(startH).padStart(2, '0')}:00`
            const endMin = startH * 60 + (task.estimatedMinutes ?? 60)
            const endH = Math.floor(endMin / 60)
            const endM = endMin % 60
            const endTime = `${String(Math.min(endH, 23)).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
            openCreate({ startTime, endTime }, { title: task.title, taskId: task.id })
          }}
          onScheduleRoutine={(routine) => {
            const startTime = routine.timeOfDay ?? (() => {
              const h = Math.max(new Date().getHours(), 8)
              return `${String(h).padStart(2, '0')}:00`
            })()
            const [sh, sm] = startTime.split(':').map(Number)
            const endH = Math.min(sh + 1, 23)
            const endTime = `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`
            openCreate({ startTime, endTime }, { title: routine.title, routineId: routine.id, blockType: '루틴' })
          }}
          onRefresh={refresh}
        />
      </div>

      {/* 모달 */}
      {modalOpen && (
        <TimeBlockModal
          block={editingBlock}
          defaultDate={selectedDate}
          defaultTime={defaultTime}
          defaultValues={defaultValues}
          tasks={todayTasks}
          projects={projects}
          routines={todayRoutines}
          onClose={closeModal}
          onSaved={() => { closeModal(); refresh() }}
        />
      )}
    </div>
  )
}

/* ── 통계 카드 ── */
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string; sub: string; color: 'blue' | 'green' | 'amber' | 'violet'
}) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40',
    green: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40',
    violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/40',
  }
  const valueMap = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
    violet: 'text-violet-700 dark:text-violet-300',
  }
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <p className={`text-lg font-black ${valueMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

/* ── 리스트 뷰 ── */
function ListView({
  blocks, onEdit, onRefresh,
}: {
  blocks: TimeBlockWithRefs[]
  onEdit: (b: TimeBlockWithRefs) => void
  onRefresh: () => void
}) {
  async function handleToggle(id: number) {
    await toggleTimeBlockDone(id)
    onRefresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('이 시간 블록을 삭제할까요?')) return
    await deleteTimeBlock(id)
    onRefresh()
  }

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3" />
        </svg>
        <p className="text-sm font-medium">오늘 등록된 시간 블록이 없습니다</p>
        <p className="text-xs">상단 버튼으로 추가해보세요</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full p-6 space-y-2">
      {blocks.map((b) => {
        const dur = calcDurationMin(b.startTime, b.endTime)
        return (
          <div
            key={b.id}
            className={`flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-gray-900 transition-all ${
              b.status === 'done'
                ? 'opacity-60 border-gray-100 dark:border-gray-800'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
            <button
              onClick={() => handleToggle(b.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                b.status === 'done'
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
              }`}
            >
              {b.status === 'done' && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className={`text-sm font-semibold ${b.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {b.title}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: b.color + '20', color: b.color }}>
                  {b.blockType}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {b.startTime} – {b.endTime} ({fmtMin(dur)})
                {b.project && <span className="ml-2 text-gray-400">· {b.project.title}</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
