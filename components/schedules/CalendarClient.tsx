'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSchedule, updateScheduleStatus } from '@/app/actions/schedules'
import ScheduleModal, { type ScheduleData } from './ScheduleModal'

// ─── Data Types ───────────────────────────────────────────────────────────────

type SerializedSchedule = {
  id: number
  title: string
  description: string | null
  scheduleDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  eventType: string
  status: string
  priority: string
  color: string
  completedAt: string | null
  notification: boolean
  projectId: number | null
  projectTitle: string | null
}

type SerializedTask = {
  id: number
  title: string
  taskDate: string
  status: string
  importance: string
  color: string
  projectId: number | null
  projectName: string | null
}

type SerializedProject = {
  id: number
  title: string
  startDate: string | null
  endDate: string | null
  color: string
  status: string
}

type SerializedRoutine = {
  id: number
  title: string
  frequency: string
  daysOfWeek: number[] | null
  timeOfDay: string | null
  color: string
  status: string
  startDate: string | null
  endDate: string | null
}

type SerializedTest = {
  id: number
  title: string
  startDate: string | null
  endDate: string | null
  status: string
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  isAllDay: boolean
  color: string
  eventType: string        // 'schedule' | 'task' | 'project_start' | 'project_end' | 'routine' | 'test_start' | 'test_end'
  displayType: string      // human-readable type label
  status: string
  priority: string
  isDone: boolean
  sourceId: number
  sourceType: 'schedule' | 'task' | 'project' | 'routine' | 'test'
  memo?: string
  projectTitle?: string
  scheduleData?: SerializedSchedule
}

type Props = {
  schedules: SerializedSchedule[]
  tasks: SerializedTask[]
  projects: SerializedProject[]
  routines: SerializedRoutine[]
  tests: SerializedTest[]
}

type ViewMode = 'month' | 'week' | 'day' | 'list'
type FilterKey = 'schedule' | 'task' | 'project' | 'routine' | 'test'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const TYPE_COLORS: Record<string, string> = {
  task:          '#3B82F6',
  project_start: '#7C3AED',
  project_end:   '#DC2626',
  routine:       '#10B981',
  test_start:    '#F97316',
  test_end:      '#EA580C',
}

const FILTER_LABELS: Record<FilterKey, string> = {
  schedule: '직접 일정',
  task:     '할 일',
  project:  '프로젝트',
  routine:  '루틴',
  test:     '테스트',
}

const IMPORTANCE_MAP: Record<string, string> = {
  high: '높음', medium: '보통', low: '낮음',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(iso: string, n: number): string {
  const d = isoToDate(iso)
  d.setDate(d.getDate() + n)
  return dateToIso(d)
}

function todayIso(): string {
  return dateToIso(new Date())
}

function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function getWeekStart(iso: string): string {
  const d = isoToDate(iso)
  const dow = d.getDay()
  d.setDate(d.getDate() - dow)
  return dateToIso(d)
}

function formatTime(t: string | null | undefined) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour < 12 ? '오전' : '오후'} ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${m}`
}

function getRoutineOccurrences(routine: SerializedRoutine, rangeStart: string, rangeEnd: string): string[] {
  const results: string[] = []
  const start = routine.startDate && routine.startDate > rangeStart ? routine.startDate : rangeStart
  const end = routine.endDate && routine.endDate < rangeEnd ? routine.endDate : rangeEnd

  let cur = start
  while (cur <= end) {
    const d = isoToDate(cur)
    let matches = false
    if (routine.frequency === 'daily') {
      matches = true
    } else if (routine.frequency === 'weekly') {
      const dow = d.getDay()
      matches = !routine.daysOfWeek || routine.daysOfWeek.length === 0
        ? dow === 1  // default Monday
        : routine.daysOfWeek.includes(dow)
    } else if (routine.frequency === 'monthly') {
      matches = d.getDate() === 1
    }
    if (matches) results.push(cur)
    cur = addDays(cur, 1)
  }
  return results
}

// ─── Event Builder ────────────────────────────────────────────────────────────

function buildEvents(
  schedules: SerializedSchedule[],
  tasks: SerializedTask[],
  projects: SerializedProject[],
  routines: SerializedRoutine[],
  tests: SerializedTest[],
  rangeStart: string,
  rangeEnd: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  // Direct schedules
  for (const s of schedules) {
    if (s.scheduleDate > rangeEnd) continue
    const effectiveEnd = s.endDate ?? s.scheduleDate
    if (effectiveEnd < rangeStart) continue
    events.push({
      id: `schedule-${s.id}`,
      title: s.title,
      date: s.scheduleDate,
      endDate: s.endDate ?? undefined,
      startTime: s.startTime ?? undefined,
      endTime: s.endTime ?? undefined,
      isAllDay: s.isAllDay,
      color: s.color,
      eventType: 'schedule',
      displayType: s.eventType,
      status: s.status,
      priority: s.priority,
      isDone: s.status === '완료',
      sourceId: s.id,
      sourceType: 'schedule',
      memo: s.description ?? undefined,
      projectTitle: s.projectTitle ?? undefined,
      scheduleData: s,
    })
  }

  // Tasks
  for (const t of tasks) {
    if (t.taskDate < rangeStart || t.taskDate > rangeEnd) continue
    events.push({
      id: `task-${t.id}`,
      title: t.title,
      date: t.taskDate,
      isAllDay: true,
      color: TYPE_COLORS.task,
      eventType: 'task',
      displayType: '할 일',
      status: t.status === 'done' ? '완료' : t.status === 'on_hold' ? '보류' : t.status === 'cancelled' ? '취소' : t.status === 'in_progress' ? '진행 중' : '예정',
      priority: IMPORTANCE_MAP[t.importance] ?? '보통',
      isDone: t.status === 'done',
      sourceId: t.id,
      sourceType: 'task',
      projectTitle: t.projectName ?? undefined,
    })
  }

  // Projects
  for (const p of projects) {
    if (p.startDate && p.startDate >= rangeStart && p.startDate <= rangeEnd) {
      events.push({
        id: `project-start-${p.id}`,
        title: `[프로젝트] ${p.title} 시작`,
        date: p.startDate,
        isAllDay: true,
        color: TYPE_COLORS.project_start,
        eventType: 'project_start',
        displayType: '프로젝트 시작',
        status: p.status === 'completed' ? '완료' : p.status === 'paused' ? '보류' : '예정',
        priority: '보통',
        isDone: p.status === 'completed',
        sourceId: p.id,
        sourceType: 'project',
      })
    }
    if (p.endDate && p.endDate >= rangeStart && p.endDate <= rangeEnd) {
      events.push({
        id: `project-end-${p.id}`,
        title: `[마감] ${p.title}`,
        date: p.endDate,
        isAllDay: true,
        color: TYPE_COLORS.project_end,
        eventType: 'project_end',
        displayType: '프로젝트 마감',
        status: p.status === 'completed' ? '완료' : '예정',
        priority: '높음',
        isDone: p.status === 'completed',
        sourceId: p.id,
        sourceType: 'project',
      })
    }
  }

  // Routines
  for (const r of routines) {
    const occurrences = getRoutineOccurrences(r, rangeStart, rangeEnd)
    for (const occ of occurrences) {
      events.push({
        id: `routine-${r.id}-${occ}`,
        title: r.title,
        date: occ,
        startTime: r.timeOfDay ?? undefined,
        isAllDay: !r.timeOfDay,
        color: r.color || TYPE_COLORS.routine,
        eventType: 'routine',
        displayType: '루틴',
        status: '예정',
        priority: '보통',
        isDone: false,
        sourceId: r.id,
        sourceType: 'routine',
      })
    }
  }

  // Tests
  for (const t of tests) {
    if (t.startDate && t.startDate >= rangeStart && t.startDate <= rangeEnd) {
      events.push({
        id: `test-start-${t.id}`,
        title: `[테스트] ${t.title} 시작`,
        date: t.startDate,
        isAllDay: true,
        color: TYPE_COLORS.test_start,
        eventType: 'test_start',
        displayType: '테스트 시작',
        status: t.status === 'completed' ? '완료' : '예정',
        priority: '보통',
        isDone: t.status === 'completed',
        sourceId: t.id,
        sourceType: 'test',
      })
    }
    if (t.endDate && t.endDate >= rangeStart && t.endDate <= rangeEnd) {
      events.push({
        id: `test-end-${t.id}`,
        title: `[테스트] ${t.title} 종료`,
        date: t.endDate,
        isAllDay: true,
        color: TYPE_COLORS.test_end,
        eventType: 'test_end',
        displayType: '테스트 종료',
        status: t.status === 'completed' ? '완료' : '예정',
        priority: '보통',
        isDone: t.status === 'completed',
        sourceId: t.id,
        sourceType: 'test',
      })
    }
  }

  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
    if (a.startTime) return 1
    if (b.startTime) return -1
    return 0
  })
}

// ─── Event Pill ──────────────────────────────────────────────────────────────

function EventPill({ event, onClick, compact = false }: { event: CalendarEvent; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`w-full text-left truncate rounded text-white font-medium transition-opacity hover:opacity-80 ${
        event.isDone ? 'opacity-50' : ''
      } ${compact ? 'text-[10px] px-1 py-px' : 'text-xs px-1.5 py-0.5'}`}
      style={{ backgroundColor: event.color }}
      title={event.title}
    >
      {event.startTime && !event.isAllDay && (
        <span className="opacity-80 mr-1">{event.startTime}</span>
      )}
      {event.isDone ? <span className="line-through">{event.title}</span> : event.title}
    </button>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, events, today, onDayClick, onEventClick,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  today: string
  onDayClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}) {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells: { date: string; isCurrentMonth: boolean }[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    cells.push({ date: dateToIso(d), isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ date: dateToIso(d), isCurrentMonth: false })
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
      // expand multi-day events
      if (ev.endDate && ev.endDate > ev.date) {
        let cur = addDays(ev.date, 1)
        while (cur <= ev.endDate) {
          if (!map.has(cur)) map.set(cur, [])
          map.get(cur)!.push({ ...ev, id: ev.id + '-cont' })
          cur = addDays(cur, 1)
        }
      }
    }
    return map
  }, [events])

  const MAX_PILLS = 3

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {DAY_KO.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-t border-gray-200 dark:border-gray-800 min-h-0 overflow-auto">
        {cells.map((cell, idx) => {
          const isToday = cell.date === today
          const isWeekend = idx % 7 === 0 || idx % 7 === 6
          const dayEvents = eventsByDate.get(cell.date) ?? []
          const visible = dayEvents.slice(0, MAX_PILLS)
          const hidden = dayEvents.length - MAX_PILLS

          return (
            <div
              key={cell.date + idx}
              onClick={() => onDayClick(cell.date)}
              className={`border-r border-b border-gray-200 dark:border-gray-800 p-1 min-h-[80px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                !cell.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-sky-500 text-white'
                    : isWeekend && cell.isCurrentMonth
                      ? idx % 7 === 0 ? 'text-red-400' : 'text-blue-400'
                      : cell.isCurrentMonth
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-300 dark:text-gray-600'
                }`}>
                  {parseInt(cell.date.split('-')[2])}
                </span>
              </div>
              <div className="space-y-0.5">
                {visible.map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDayClick(cell.date) }}
                    className="text-[10px] text-gray-400 hover:text-sky-500 pl-1"
                  >
                    +{hidden}개 더
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, events, today, onDayClick, onEventClick,
}: {
  weekStart: string
  events: CalendarEvent[]
  today: string
  onDayClick: (date: string) => void
  onEventClick: (event: CalendarEvent) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
    }
    return map
  }, [events])

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-l border-t border-gray-200 dark:border-gray-800 min-h-full">
        {days.map((date, i) => {
          const isToday = date === today
          const dayEvents = eventsByDate.get(date) ?? []
          const d = isoToDate(date)
          return (
            <div key={date} className="border-r border-gray-200 dark:border-gray-800">
              {/* Day header */}
              <div
                onClick={() => onDayClick(date)}
                className={`border-b border-gray-200 dark:border-gray-800 p-2 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  isToday ? 'bg-sky-50 dark:bg-sky-900/20' : ''
                }`}
              >
                <div className={`text-[10px] font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>
                  {DAY_KO[d.getDay()]}
                </div>
                <div className={`text-lg font-black mt-0.5 ${isToday ? 'text-sky-500' : 'text-gray-700 dark:text-gray-300'}`}>
                  {d.getDate()}
                </div>
              </div>
              {/* Events */}
              <div className="p-1 space-y-0.5 min-h-[200px]">
                {dayEvents.map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  date, events, onEventClick,
}: {
  date: string
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}) {
  const dayEvents = events.filter((e) => e.date === date)
  const allDayEvents = dayEvents.filter((e) => e.isAllDay || !e.startTime)
  const timedEvents = dayEvents.filter((e) => !e.isAllDay && e.startTime)
  const d = isoToDate(date)

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
        {d.getMonth() + 1}월 {d.getDate()}일 ({DAY_KO[d.getDay()]})
      </div>

      {allDayEvents.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">종일</p>
          <div className="space-y-1">
            {allDayEvents.map((ev) => (
              <EventPill key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
            ))}
          </div>
        </div>
      )}

      {timedEvents.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">시간 지정</p>
          <div className="space-y-2">
            {timedEvents
              .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
              .map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="w-full flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-2 transition-colors"
                >
                  <div className="flex-shrink-0 text-xs text-gray-500 w-16 pt-0.5">
                    {formatTime(ev.startTime ?? null)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                      <span className={`text-sm font-semibold ${ev.isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                        {ev.title}
                      </span>
                    </div>
                    {ev.endTime && <p className="text-xs text-gray-400 ml-4.5 mt-0.5">~ {formatTime(ev.endTime)}</p>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ) : null}

      {dayEvents.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">이 날 등록된 일정이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  events, today, onEventClick,
}: {
  events: CalendarEvent[]
  today: string
  onEventClick: (event: CalendarEvent) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">표시할 일정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {grouped.map(([date, dayEvents]) => {
        const d = isoToDate(date)
        const isToday = date === today
        const isPast = date < today
        return (
          <div key={date}>
            <div className={`sticky top-0 flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-800 ${
              isToday ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-gray-50 dark:bg-gray-800/80'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isToday ? 'bg-sky-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
              }`}>
                <span className={`text-sm font-black ${isToday ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div>
                <p className={`text-xs font-bold ${isToday ? 'text-sky-600 dark:text-sky-400' : isPast ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {d.getFullYear()}년 {d.getMonth() + 1}월 {d.getDate()}일 ({DAY_KO[d.getDay()]})
                </p>
                {isToday && <p className="text-[10px] text-sky-500">오늘</p>}
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {dayEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onEventClick(ev)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${ev.isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {ev.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ev.displayType}
                      {ev.startTime && ` · ${formatTime(ev.startTime)}`}
                      {ev.projectTitle && ` · ${ev.projectTitle}`}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ev.isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : ev.status === '보류' ? 'bg-amber-100 text-amber-700'
                      : ev.status === '취소' ? 'bg-red-100 text-red-600'
                      : ev.status === '진행 중' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : isPast ? 'bg-gray-100 text-gray-500'
                      : 'bg-gray-50 text-gray-400'
                    }`}>
                      {ev.isDone ? '완료' : ev.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Event Detail Popup ───────────────────────────────────────────────────────

function EventDetail({
  event, onClose, onEdit, onDelete, onComplete,
}: {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const d = isoToDate(event.date)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 rounded-t-2xl" style={{ backgroundColor: event.color }} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: event.color }}>
                  {event.displayType}
                </span>
                {event.priority === '높음' || event.priority === '매우 중요' ? (
                  <span className="text-xs text-red-500">★ {event.priority}</span>
                ) : null}
              </div>
              <h3 className={`text-base font-bold text-gray-900 dark:text-white ${event.isDone ? 'line-through opacity-60' : ''}`}>
                {event.title}
              </h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {d.getFullYear()}년 {d.getMonth() + 1}월 {d.getDate()}일 ({DAY_KO[d.getDay()]})
                {event.endDate && event.endDate !== event.date && (
                  <> ~ {isoToDate(event.endDate).getMonth() + 1}월 {isoToDate(event.endDate).getDate()}일</>
                )}
              </span>
            </div>

            {(event.startTime || event.isAllDay) && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {event.isAllDay ? '하루 종일'
                    : `${formatTime(event.startTime ?? null)}${event.endTime ? ` ~ ${formatTime(event.endTime)}` : ''}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                event.isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : event.status === '보류' ? 'bg-amber-100 text-amber-700'
                : event.status === '취소' ? 'bg-red-100 text-red-600'
                : event.status === '진행 중' ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {event.isDone ? '완료' : event.status}
              </span>
              <span className="text-xs text-gray-400">{event.priority}</span>
            </div>

            {event.projectTitle && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>{event.projectTitle}</span>
              </div>
            )}

            {event.memo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 leading-relaxed">
                {event.memo}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {!event.isDone && event.sourceType === 'schedule' && (
              <button
                onClick={onComplete}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600 transition-colors"
              >
                완료 처리
              </button>
            )}
            {event.sourceType === 'schedule' && (
              <>
                <button
                  onClick={onEdit}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={onDelete}
                  className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-800/50 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  삭제
                </button>
              </>
            )}
            {event.sourceType !== 'schedule' && (
              <p className="text-[10px] text-gray-400 text-center flex-1 flex items-center justify-center">
                {event.sourceType === 'task' ? '할 일 페이지에서 수정' :
                 event.sourceType === 'project' ? '프로젝트 페이지에서 수정' :
                 event.sourceType === 'routine' ? '루틴 페이지에서 수정' : '테스트 페이지에서 수정'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  schedules, allEvents, today, selectedDate, onDayClick, filters, onToggleFilter,
}: {
  schedules: SerializedSchedule[]
  allEvents: CalendarEvent[]
  today: string
  selectedDate: string
  onDayClick: (date: string) => void
  filters: Record<FilterKey, boolean>
  onToggleFilter: (key: FilterKey) => void
}) {
  const [miniYear, setMiniYear] = useState(() => isoToDate(selectedDate).getFullYear())
  const [miniMonth, setMiniMonth] = useState(() => isoToDate(selectedDate).getMonth())

  const todayEvents = allEvents.filter((e) => e.date === today)
  const weekStart = getWeekStart(today)
  const weekEnd = addDays(weekStart, 6)
  const weekEvents = allEvents.filter((e) => e.date >= weekStart && e.date <= weekEnd)
  const upcomingEvents = allEvents.filter((e) => e.date > today && !e.isDone)
  const notDoneEvents = allEvents.filter((e) => !e.isDone && e.date >= today)

  const firstDay = new Date(miniYear, miniMonth, 1).getDay()
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const eventDates = new Set(allEvents.map((e) => e.date))

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
      {/* Mini Calendar */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => {
            if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1) }
            else setMiniMonth(m => m - 1)
          }} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => { setMiniYear(isoToDate(today).getFullYear()); setMiniMonth(isoToDate(today).getMonth()) }}
            className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-sky-500 transition-colors"
          >
            {miniYear}년 {MONTH_KO[miniMonth]}
          </button>
          <button onClick={() => {
            if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1) }
            else setMiniMonth(m => m + 1)
          }} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_KO.map((d) => (
            <div key={d} className="text-[9px] font-bold text-center text-gray-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />
            const dateStr = `${miniYear}-${String(miniMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const hasEvent = eventDates.has(dateStr)
            return (
              <button
                key={i}
                onClick={() => onDayClick(dateStr)}
                className={`relative text-[11px] font-semibold w-7 h-7 flex items-center justify-center rounded-full mx-auto transition-colors ${
                  isSelected ? 'bg-sky-500 text-white'
                  : isToday ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {day}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2">
        {[
          { label: '오늘 일정', value: todayEvents.length, color: 'text-sky-600 dark:text-sky-400' },
          { label: '이번 주', value: weekEvents.length, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: '예정된 일정', value: upcomingEvents.length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '미완료', value: notDoneEvents.length, color: 'text-amber-600 dark:text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
            <span className={`text-sm font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">필터</p>
        <div className="space-y-2">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onToggleFilter(key)}
              className="flex items-center gap-2 w-full text-left"
            >
              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                filters[key]
                  ? 'border-sky-500 bg-sky-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {filters[key] && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{
                  backgroundColor:
                    key === 'task' ? TYPE_COLORS.task
                    : key === 'project' ? TYPE_COLORS.project_start
                    : key === 'routine' ? TYPE_COLORS.routine
                    : key === 'test' ? TYPE_COLORS.test_start
                    : '#0EA5E9'
                }} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{FILTER_LABELS[key]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarClient({ schedules, tasks, projects, routines, tests }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const today = todayIso()

  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    schedule: true, task: true, project: true, routine: true, test: true,
  })
  const [search, setSearch] = useState('')
  const [showOnlyUndone, setShowOnlyUndone] = useState(false)
  const [showOnlyImportant, setShowOnlyImportant] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editSchedule, setEditSchedule] = useState<ScheduleData | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Compute visible date range for event building
  const { rangeStart, rangeEnd, year, month } = useMemo(() => {
    const d = isoToDate(currentDate)
    const y = d.getFullYear()
    const m = d.getMonth()
    if (view === 'month') {
      const ms = getMonthStart(y, m)
      const rs = addDays(ms, -7)
      const re = addDays(ms, 42)
      return { rangeStart: rs, rangeEnd: re, year: y, month: m }
    }
    if (view === 'week') {
      const ws = getWeekStart(currentDate)
      return { rangeStart: ws, rangeEnd: addDays(ws, 6), year: y, month: m }
    }
    return { rangeStart: currentDate, rangeEnd: currentDate, year: y, month: m }
  }, [currentDate, view])

  const listRangeStart = useMemo(() => {
    if (view !== 'list') return rangeStart
    const d = isoToDate(currentDate)
    return getMonthStart(d.getFullYear(), d.getMonth())
  }, [view, currentDate, rangeStart])

  const listRangeEnd = useMemo(() => {
    if (view !== 'list') return rangeEnd
    const d = isoToDate(currentDate)
    const ms = getMonthStart(d.getFullYear(), d.getMonth())
    return addDays(ms, 60)
  }, [view, currentDate, rangeEnd])

  const effectiveStart = view === 'list' ? listRangeStart : rangeStart
  const effectiveEnd = view === 'list' ? listRangeEnd : rangeEnd

  const allEvents = useMemo(
    () => buildEvents(schedules, tasks, projects, routines, tests, effectiveStart, effectiveEnd),
    [schedules, tasks, projects, routines, tests, effectiveStart, effectiveEnd]
  )

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (!filters[ev.sourceType as FilterKey]) return false
      if (showOnlyUndone && ev.isDone) return false
      if (showOnlyImportant && ev.priority !== '높음' && ev.priority !== '매우 중요') return false
      if (search) {
        const q = search.toLowerCase()
        if (![ev.title, ev.memo, ev.projectTitle, ev.displayType].some((s) => s?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [allEvents, filters, showOnlyUndone, showOnlyImportant, search])

  function navigate(delta: number) {
    const d = isoToDate(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    setCurrentDate(dateToIso(d))
  }

  function goToday() {
    setCurrentDate(today)
    setSelectedDate(today)
  }

  function handleDayClick(date: string) {
    setSelectedDate(date)
    if (view === 'month') {
      setCurrentDate(date)
      setView('day')
    }
  }

  function handleEventClick(ev: CalendarEvent) {
    setSelectedEvent(ev)
  }

  function openAddModal(date?: string) {
    setEditSchedule(null)
    setSelectedDate(date ?? currentDate)
    setShowModal(true)
  }

  function handleEdit() {
    if (!selectedEvent?.scheduleData) return
    setEditSchedule(selectedEvent.scheduleData as ScheduleData)
    setSelectedEvent(null)
    setShowModal(true)
  }

  function handleDeleteRequest() {
    if (!selectedEvent?.scheduleData) return
    setDeleteConfirmId(selectedEvent.sourceId)
    setSelectedEvent(null)
  }

  function handleDeleteConfirm() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    startTransition(async () => {
      await deleteSchedule(id)
      router.refresh()
    })
  }

  function handleComplete() {
    if (!selectedEvent?.scheduleData) return
    const id = selectedEvent.sourceId
    setSelectedEvent(null)
    startTransition(async () => {
      await updateScheduleStatus(id, '완료')
      router.refresh()
    })
  }

  function toggleFilter(key: FilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function closeModal() {
    setShowModal(false)
    setEditSchedule(null)
    router.refresh()
  }

  // Navigation label
  const navLabel = useMemo(() => {
    const d = isoToDate(currentDate)
    const y = d.getFullYear()
    const m = d.getMonth()
    if (view === 'month') return `${y}년 ${MONTH_KO[m]}`
    if (view === 'week') {
      const ws = getWeekStart(currentDate)
      const we = addDays(ws, 6)
      const ds = isoToDate(ws)
      const de = isoToDate(we)
      return `${ds.getMonth() + 1}월 ${ds.getDate()}일 ~ ${de.getMonth() + 1}월 ${de.getDate()}일`
    }
    if (view === 'list') return `${y}년 ${MONTH_KO[m]} ~`
    return `${y}년 ${m + 1}월 ${d.getDate()}일`
  }, [currentDate, view])

  const allProjects = useMemo(() => projects.map((p) => ({ id: p.id, title: p.title })), [projects])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* ── Top Header ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">일정 관리</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">날짜별로 일정을 등록하고 해야 할 일을 한눈에 확인합니다.</p>
          </div>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            일정 추가
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ── */}
        <Sidebar
          schedules={schedules}
          allEvents={allEvents}
          today={today}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          filters={filters}
          onToggleFilter={toggleFilter}
        />

        {/* ── Main Calendar Area ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* View Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
              >
                오늘
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 ml-1">{navLabel}</span>
            </div>

            {/* Search + Quick Filters */}
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="일정 검색..."
                className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-sky-400 transition-colors w-36"
              />
              <button
                onClick={() => setShowOnlyUndone((v) => !v)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  showOnlyUndone
                    ? 'border-sky-300 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                미완료만
              </button>
              <button
                onClick={() => setShowOnlyImportant((v) => !v)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  showOnlyImportant
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                ★ 중요
              </button>
            </div>

            {/* View Mode Buttons */}
            <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
              {(['month', 'week', 'day', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    view === v
                      ? 'bg-sky-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {v === 'month' ? '월' : v === 'week' ? '주' : v === 'day' ? '일' : '목록'}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Content */}
          {view === 'month' && (
            <MonthView
              year={year}
              month={month}
              events={filteredEvents}
              today={today}
              onDayClick={(date) => { setSelectedDate(date); setView('day'); setCurrentDate(date) }}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'week' && (
            <WeekView
              weekStart={getWeekStart(currentDate)}
              events={filteredEvents}
              today={today}
              onDayClick={(date) => { setSelectedDate(date); setView('day'); setCurrentDate(date) }}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'day' && (
            <DayView
              date={currentDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'list' && (
            <ListView
              events={filteredEvents}
              today={today}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>

      {/* Event Detail Popup */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onComplete={handleComplete}
        />
      )}

      {/* Schedule Modal */}
      {showModal && (
        <ScheduleModal
          onClose={closeModal}
          schedule={editSchedule ?? undefined}
          defaultDate={selectedDate}
          projects={allProjects}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">일정 삭제</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">정말 이 일정을 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
          처리 중...
        </div>
      )}
    </div>
  )
}
