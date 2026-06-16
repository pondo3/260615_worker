'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSchedule } from '@/app/actions/schedules'
import ScheduleModal from './ScheduleModal'

type Schedule = {
  id: number
  title: string
  description: string | null
  scheduleDate: string
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  color: string
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function todayStr() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string, showYear = false) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const dow = DAY_KO[d.getDay()]
  return showYear ? `${y}년 ${m}월 ${day}일 (${dow})` : `${m}월 ${day}일 (${dow})`
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour < 12 ? '오전' : '오후'} ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${m}`
}

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - dow + (dow === 0 ? -6 : 1))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] }
}

/* ─── 일정 카드 ─── */
function ScheduleCard({ schedule, onEdit, onDelete }: {
  schedule: Schedule
  onEdit: (s: Schedule) => void
  onDelete: (id: number) => void
}) {
  const today = todayStr()
  const isPast = schedule.scheduleDate < today
  const isToday = schedule.scheduleDate === today

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all ${isPast ? 'opacity-60' : ''}`}>
      <div className="h-1" style={{ backgroundColor: schedule.color }} />
      <div className="p-5">
        {/* 날짜 배지 */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isToday ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
            : isPast ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          }`}>
            {isToday ? '오늘' : isPast ? '지남' : '예정'}
          </span>
          <span className="text-xs text-gray-400">{formatDate(schedule.scheduleDate)}</span>
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{schedule.title}</h3>

        {/* 시간 */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {schedule.isAllDay
            ? '하루 종일'
            : schedule.startTime
              ? `${formatTime(schedule.startTime)}${schedule.endTime ? ` — ${formatTime(schedule.endTime)}` : ''}`
              : '시간 미정'
          }
        </div>

        {schedule.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{schedule.description}</p>
        )}

        {/* 액션 */}
        <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
          <button onClick={() => onEdit(schedule)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </button>
          <button onClick={() => onDelete(schedule.id)}
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

/* ─── 리스트 행 ─── */
function ScheduleRow({ schedule, onEdit, onDelete }: {
  schedule: Schedule
  onEdit: (s: Schedule) => void
  onDelete: (id: number) => void
}) {
  const today = todayStr()
  const isPast = schedule.scheduleDate < today
  const isToday = schedule.scheduleDate === today

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isPast ? 'opacity-60' : ''}`}>
      {/* 날짜 */}
      <div className="w-16 flex-shrink-0 text-center">
        <div className={`text-lg font-black ${isToday ? 'text-sky-500' : 'text-gray-700 dark:text-gray-300'}`}>
          {new Date(schedule.scheduleDate).getDate()}
        </div>
        <div className="text-[9px] text-gray-400">{DAY_KO[new Date(schedule.scheduleDate).getDay()]}요일</div>
      </div>

      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: schedule.color }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{schedule.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {schedule.isAllDay ? '하루 종일'
            : schedule.startTime
              ? `${formatTime(schedule.startTime)}${schedule.endTime ? ` — ${formatTime(schedule.endTime)}` : ''}`
              : '시간 미정'}
        </p>
      </div>

      {isToday && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 flex-shrink-0">오늘</span>
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onEdit(schedule)} className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(schedule.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── 미니 캘린더 ─── */
function MiniCalendar({ schedules, onDayClick, selectedDate }: {
  schedules: Schedule[]
  onDayClick: (date: string) => void
  selectedDate: string | null
}) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const today = todayStr()

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const scheduleDates = new Set(schedules.map((s) => s.scheduleDate))

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{year}년 {MONTH_KO[month]}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_KO.map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasSchedule = scheduleDates.has(dateStr)
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const dow = (firstDay + day - 1) % 7

          return (
            <button
              key={day}
              onClick={() => onDayClick(dateStr)}
              className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-semibold transition-all ${
                isSelected ? 'bg-sky-500 text-white'
                : isToday ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 ' + (dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-700 dark:text-gray-300')
              }`}>
              {day}
              {hasSchedule && (
                <div className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-sky-400'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── 필터 ─── */
type FilterKey = 'upcoming' | 'today' | 'week' | 'all' | 'past'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'upcoming', label: '예정' },
  { key: 'today',    label: '오늘' },
  { key: 'week',     label: '이번 주' },
  { key: 'all',      label: '전체' },
  { key: 'past',     label: '지난 일정' },
]

/* ─── 메인 ─── */
export default function ScheduleListClient({ schedules }: { schedules: Schedule[] }) {
  const [filter, setFilter] = useState<FilterKey>('upcoming')
  const [view, setView] = useState<'card' | 'list'>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addDefaultDate, setAddDefaultDate] = useState<string | undefined>()
  const [, startTransition] = useTransition()
  const router = useRouter()

  const today = todayStr()
  const week = getWeekRange()

  function applyFilter(list: Schedule[]) {
    if (selectedDate) return list.filter((s) => s.scheduleDate === selectedDate)
    switch (filter) {
      case 'today':    return list.filter((s) => s.scheduleDate === today)
      case 'week':     return list.filter((s) => s.scheduleDate >= week.start && s.scheduleDate <= week.end)
      case 'upcoming': return list.filter((s) => s.scheduleDate >= today)
      case 'past':     return list.filter((s) => s.scheduleDate < today).reverse()
      default:         return list
    }
  }

  const filtered = applyFilter([...schedules].sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate)))

  // 날짜별 그룹
  const groups: { date: string; items: Schedule[] }[] = []
  for (const s of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.date === s.scheduleDate) last.items.push(s)
    else groups.push({ date: s.scheduleDate, items: [s] })
  }

  const todayCount = schedules.filter((s) => s.scheduleDate === today).length
  const upcomingCount = schedules.filter((s) => s.scheduleDate > today).length
  const thisWeekCount = schedules.filter((s) => s.scheduleDate >= week.start && s.scheduleDate <= week.end).length

  function handleDelete(id: number) {
    if (!confirm('일정을 삭제하시겠습니까?')) return
    startTransition(() => { deleteSchedule(id) })
  }
  function handleAddClose() { setShowAdd(false); setAddDefaultDate(undefined); router.refresh() }
  function handleEditClose() { setEditSchedule(null); router.refresh() }

  function handleDayClick(date: string) {
    setSelectedDate((prev) => prev === date ? null : date)
    if (selectedDate !== date) setFilter('all')
  }

  function handleAddOnDate(date: string) {
    setAddDefaultDate(date)
    setShowAdd(true)
  }

  return (
    <div className="p-8">
      {/* 배너 */}
      <div className="relative bg-sky-950 rounded-2xl mb-6 overflow-hidden">
        <div className="h-1 bg-sky-500" />
        <div className="px-7 py-6">
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #0ea5e9 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white mb-0.5">일정 관리</h1>
              <p className="text-sky-300 text-sm">날짜별로 일정을 등록하고 한눈에 확인합니다</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-950 text-sm font-bold rounded-xl hover:bg-sky-50 transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              일정 추가
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 왼쪽: 캘린더 + 통계 */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <MiniCalendar schedules={schedules} onDayClick={handleDayClick} selectedDate={selectedDate} />

          {/* 빠른 추가 */}
          {selectedDate && (
            <button
              onClick={() => handleAddOnDate(selectedDate)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-800 text-sm font-semibold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors">
              + {formatDate(selectedDate)} 일정 추가
            </button>
          )}

          {/* 통계 */}
          <div className="space-y-2">
            {[
              { label: '오늘 일정', value: todayCount, color: 'text-sky-600 dark:text-sky-400' },
              { label: '이번 주', value: thisWeekCount, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: '예정된 일정', value: upcomingCount, color: 'text-indigo-600 dark:text-indigo-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                <span className={`text-lg font-black ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 목록 */}
        <div className="flex-1 min-w-0">
          {/* 필터 + 뷰 토글 */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <div className="flex items-center gap-1.5 flex-1 flex-wrap">
              {selectedDate ? (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {formatDate(selectedDate)} 선택됨
                </button>
              ) : (
                FILTERS.map(({ key, label }) => (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      filter === key
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}>
                    {label}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex-shrink-0">
              <button onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => setView('card')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400'}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* 빈 상태 */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium mb-2">일정이 없습니다</p>
              <button onClick={() => setShowAdd(true)} className="text-sm text-sky-500 hover:underline font-medium">
                + 일정 추가하기
              </button>
            </div>
          )}

          {/* 리스트 뷰 - 날짜 그룹 */}
          {view === 'list' && groups.length > 0 && (
            <div className="space-y-4">
              {groups.map(({ date, items }) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-xs font-bold ${date === todayStr() ? 'text-sky-600 dark:text-sky-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatDate(date, true)}
                    </h3>
                    {date === todayStr() && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">오늘</span>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    {items.map((s, i) => (
                      <div key={s.id} className={i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
                        <ScheduleRow schedule={s} onEdit={setEditSchedule} onDelete={handleDelete} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 카드 뷰 */}
          {view === 'card' && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((s) => (
                <ScheduleCard key={s.id} schedule={s} onEdit={setEditSchedule} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && <ScheduleModal onClose={handleAddClose} defaultDate={addDefaultDate} projects={[]} />}
      {editSchedule && (
        <ScheduleModal
          schedule={{ ...editSchedule, endDate: null, eventType: '일반', status: '예정', priority: '보통', completedAt: null, notification: false, projectId: null, projectTitle: null }}
          onClose={handleEditClose}
          projects={[]}
        />
      )}
    </div>
  )
}
