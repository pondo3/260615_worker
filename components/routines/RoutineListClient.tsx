'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRoutine, toggleRoutineLog } from '@/app/actions/routines'
import RoutineModal from './RoutineModal'

type Routine = {
  id: number
  title: string
  description: string | null
  frequency: string
  daysOfWeek: number[] | null
  timeOfDay: string | null
  color: string
  status: string
  startDate: string | null
  endDate: string | null
}

type LogMap = Record<number, boolean> // routineId → today done?
type StatsMap = Record<number, { total: number; done: number; streak: number }>

const FREQ_KO: Record<string, string> = { daily: '매일', weekly: '매주', monthly: '매월', custom: '직접' }
const STATUS_KO: Record<string, string> = { active: '진행 중', paused: '중단', archived: '보관' }
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  paused:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function todayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function isTodayRoutine(r: Routine, todayDow: number): boolean {
  if (r.status !== 'active') return false
  if (r.frequency === 'daily') return true
  if (r.frequency === 'weekly') return (r.daysOfWeek ?? []).includes(todayDow)
  if (r.frequency === 'monthly') return true
  return true
}

/* ─── 오늘 루틴 체크 카드 ─── */
function TodayRoutineItem({ routine, done, onToggle }: {
  routine: Routine
  done: boolean
  onToggle: () => void
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
      done
        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-70'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:shadow-sm'
    }`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          done ? 'border-transparent' : 'border-gray-300 dark:border-gray-600 hover:border-current'
        }`}
        style={done ? { backgroundColor: routine.color } : { borderColor: routine.color }}
      >
        {done && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {routine.title}
        </p>
        {routine.timeOfDay && (
          <p className="text-[10px] text-gray-400 mt-0.5">{routine.timeOfDay}</p>
        )}
      </div>

      <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: routine.color }} />
    </div>
  )
}

/* ─── 루틴 카드 ─── */
function RoutineCard({ routine, stats, todayDone, onEdit, onDelete, onToggleToday }: {
  routine: Routine
  stats: { total: number; done: number; streak: number }
  todayDone: boolean
  onEdit: (r: Routine) => void
  onDelete: (id: number) => void
  onToggleToday: () => void
}) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  const isActive = routine.status === 'active'

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden ${!isActive ? 'opacity-60' : ''}`}>
      <div className="h-1" style={{ backgroundColor: routine.color }} />
      <div className="p-5">
        {/* 배지 */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
            {FREQ_KO[routine.frequency]}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[routine.status]}`}>
            {STATUS_KO[routine.status]}
          </span>
          {routine.frequency === 'weekly' && routine.daysOfWeek && routine.daysOfWeek.length > 0 && (
            <span className="text-[10px] text-gray-400 ml-auto">
              {routine.daysOfWeek.map((d) => DAY_LABELS[d]).join('·')}
            </span>
          )}
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{routine.title}</h3>
        {routine.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">{routine.description}</p>
        )}
        {routine.timeOfDay && (
          <p className="text-[10px] text-gray-400 mb-3">⏰ {routine.timeOfDay}</p>
        )}

        {/* 통계 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">달성률</span>
              <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-indigo-500' : 'text-gray-400'}`}>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: routine.color }} />
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            <p className={`text-lg font-black ${stats.streak > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`}>
              {stats.streak > 0 ? `🔥${stats.streak}` : '—'}
            </p>
            <p className="text-[9px] text-gray-400">연속</p>
          </div>
        </div>

        {/* 오늘 체크 (활성일 때만) */}
        {isActive && (
          <button
            onClick={onToggleToday}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all mb-3 ${
              todayDone
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'
            }`}>
            {todayDone ? '✓ 오늘 완료' : '오늘 완료 체크'}
          </button>
        )}

        {/* 액션 */}
        <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
          <button onClick={() => onEdit(routine)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </button>
          <button onClick={() => onDelete(routine.id)}
            className="flex items-center justify-center px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 리스트 뷰 행 ─── */
function RoutineRow({ routine, stats, todayDone, onEdit, onDelete, onToggleToday }: {
  routine: Routine
  stats: { total: number; done: number; streak: number }
  todayDone: boolean
  onEdit: (r: Routine) => void
  onDelete: (id: number) => void
  onToggleToday: () => void
}) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* 오늘 체크 */}
      <button
        onClick={onToggleToday}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          todayDone ? 'border-transparent' : 'border-gray-300 dark:border-gray-600'
        }`}
        style={todayDone ? { backgroundColor: routine.color } : {}}>
        {todayDone && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: routine.color }} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${todayDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {routine.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            {FREQ_KO[routine.frequency]}
          </span>
          {routine.frequency === 'weekly' && routine.daysOfWeek && (
            <span className="text-[10px] text-gray-400">{routine.daysOfWeek.map(d => DAY_LABELS[d]).join('·')}</span>
          )}
          {routine.timeOfDay && <span className="text-[10px] text-gray-400">{routine.timeOfDay}</span>}
        </div>
      </div>

      {/* 달성률 바 */}
      <div className="w-24 flex-shrink-0">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: routine.color }} />
        </div>
      </div>

      {/* 스트릭 */}
      <span className={`text-xs font-bold w-12 text-right flex-shrink-0 ${stats.streak > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`}>
        {stats.streak > 0 ? `🔥${stats.streak}` : '—'}
      </span>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onEdit(routine)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(routine.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── 필터 ─── */
type FilterKey = 'all' | 'active' | 'daily' | 'weekly' | 'monthly' | 'paused'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'active',  label: '진행 중' },
  { key: 'daily',   label: '매일' },
  { key: 'weekly',  label: '매주' },
  { key: 'monthly', label: '매월' },
  { key: 'paused',  label: '중단' },
]

/* ─── 메인 ─── */
export default function RoutineListClient({
  routines,
  logMap,
  statsMap,
}: {
  routines: Routine[]
  logMap: LogMap
  statsMap: StatsMap
}) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<'card' | 'list'>('card')
  const [showAdd, setShowAdd] = useState(false)
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null)
  const [localLog, setLocalLog] = useState<LogMap>(logMap)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const today = todayISO()
  const todayDow = new Date().getDay()

  const todayRoutines = routines.filter((r) => isTodayRoutine(r, todayDow))
  const todayDone = todayRoutines.filter((r) => localLog[r.id]).length

  const filtered = routines.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'active') return r.status === 'active'
    if (filter === 'paused') return r.status === 'paused' || r.status === 'archived'
    return r.frequency === filter
  })

  const overallStreak = routines.length > 0
    ? Math.max(...routines.map((r) => statsMap[r.id]?.streak ?? 0))
    : 0

  function handleToggle(routineId: number) {
    const current = localLog[routineId] ?? false
    setLocalLog((prev) => ({ ...prev, [routineId]: !current }))
    startTransition(() => { toggleRoutineLog(routineId, today, current) })
  }

  function handleDelete(id: number) {
    if (!confirm('루틴을 삭제하시겠습니까?')) return
    startTransition(() => { deleteRoutine(id) })
  }

  function handleAddClose() { setShowAdd(false); router.refresh() }
  function handleEditClose() { setEditRoutine(null); router.refresh() }

  return (
    <div className="p-8">
      {/* 배너 */}
      <div className="relative bg-indigo-950 rounded-2xl mb-6 overflow-hidden">
        <div className="h-1 bg-indigo-500" />
        <div className="px-7 py-6">
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #6366f1 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white mb-0.5">루틴 관리</h1>
              <p className="text-indigo-300 text-sm">매일·매주·매월 반복 루틴을 설정하고 꾸준히 실행합니다</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-950 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              루틴 추가
            </button>
          </div>
        </div>
      </div>

      {/* 오늘 루틴 섹션 */}
      {todayRoutines.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">오늘 루틴</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                {todayDone}/{todayRoutines.length}
              </span>
            </div>
            {todayDone === todayRoutines.length && todayRoutines.length > 0 && (
              <span className="text-xs font-bold text-emerald-500">🎉 전부 완료!</span>
            )}
          </div>
          {/* 오늘 진행바 */}
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${todayRoutines.length > 0 ? (todayDone / todayRoutines.length) * 100 : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayRoutines.map((r) => (
              <TodayRoutineItem
                key={r.id}
                routine={r}
                done={localLog[r.id] ?? false}
                onToggle={() => handleToggle(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체 루틴', value: routines.length, color: 'text-gray-700 dark:text-white' },
          { label: '진행 중', value: routines.filter(r => r.status === 'active').length, color: 'text-blue-600 dark:text-blue-400' },
          { label: '오늘 완료', value: `${todayDone}/${todayRoutines.length}`, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '최장 연속', value: overallStreak > 0 ? `🔥${overallStreak}일` : '—', color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 + 뷰 토글 */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex-shrink-0">
          <button onClick={() => setView('card')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm font-medium mb-2">루틴이 없습니다</p>
          {filter === 'all' && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-indigo-500 hover:underline font-medium">
              + 첫 번째 루틴 추가하기
            </button>
          )}
        </div>
      )}

      {/* 카드 뷰 */}
      {view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              stats={statsMap[r.id] ?? { total: 0, done: 0, streak: 0 }}
              todayDone={localLog[r.id] ?? false}
              onEdit={setEditRoutine}
              onDelete={handleDelete}
              onToggleToday={() => handleToggle(r.id)}
            />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {filtered.map((r, i) => (
            <div key={r.id} className={i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
              <RoutineRow
                routine={r}
                stats={statsMap[r.id] ?? { total: 0, done: 0, streak: 0 }}
                todayDone={localLog[r.id] ?? false}
                onEdit={setEditRoutine}
                onDelete={handleDelete}
                onToggleToday={() => handleToggle(r.id)}
              />
            </div>
          ))}
        </div>
      )}

      {showAdd && <RoutineModal onClose={handleAddClose} />}
      {editRoutine && (
        <RoutineModal
          routine={{
            ...editRoutine,
            startDate: editRoutine.startDate ? new Date(editRoutine.startDate) : null,
            endDate: editRoutine.endDate ? new Date(editRoutine.endDate) : null,
          }}
          onClose={handleEditClose}
        />
      )}
    </div>
  )
}
