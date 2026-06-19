'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type NotifItem = {
  id: string
  type: 'task' | 'schedule' | 'routine' | 'project'
  title: string
  dateTime: string   // ISO — 알림 기준 시각 (이벤트 시각)
  href: string
  minutesBefore: number
}

function buildDateTime(dateObj: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const dt = new Date(dateObj)
  dt.setHours(h, m, 0, 0)
  return dt
}

export async function getUpcomingNotifications(): Promise<NotifItem[]> {
  const session = await verifySession()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const results: NotifItem[] = []

  // ── Tasks with dueTime today ──
  const tasks = await prisma.task.findMany({
    where: {
      userId: session.userId,
      taskDate: { gte: todayStart, lte: todayEnd },
      dueTime: { not: null },
      status: { notIn: ['done', 'cancelled'] },
    },
    select: { id: true, title: true, taskDate: true, dueTime: true },
  })
  for (const t of tasks) {
    if (!t.dueTime) continue
    results.push({
      id: `task-${t.id}`,
      type: 'task',
      title: t.title,
      dateTime: buildDateTime(t.taskDate, t.dueTime).toISOString(),
      href: '/tasks/today',
      minutesBefore: 10,
    })
  }

  // ── Schedules with startTime today ──
  const schedules = await prisma.schedule.findMany({
    where: {
      userId: session.userId,
      scheduleDate: { gte: todayStart, lte: todayEnd },
      startTime: { not: null },
      status: { not: '완료' },
    },
    select: { id: true, title: true, scheduleDate: true, startTime: true },
  })
  for (const s of schedules) {
    if (!s.startTime) continue
    results.push({
      id: `schedule-${s.id}`,
      type: 'schedule',
      title: s.title,
      dateTime: buildDateTime(s.scheduleDate, s.startTime).toISOString(),
      href: '/schedules',
      minutesBefore: 10,
    })
  }

  // ── Routines with timeOfDay today ──
  const todayDow = now.getDay() // 0=일 ~ 6=토
  const routines = await prisma.routine.findMany({
    where: {
      userId: session.userId,
      status: 'active',
      timeOfDay: { not: null },
    },
    select: { id: true, title: true, timeOfDay: true, frequency: true, daysOfWeek: true },
  })
  for (const r of routines) {
    if (!r.timeOfDay) continue
    const applies =
      r.frequency === 'daily' ||
      (r.frequency === 'weekly' &&
        Array.isArray(r.daysOfWeek) &&
        (r.daysOfWeek as number[]).includes(todayDow))
    if (!applies) continue
    const dt = new Date(todayStart)
    results.push({
      id: `routine-${r.id}`,
      type: 'routine',
      title: r.title,
      dateTime: buildDateTime(dt, r.timeOfDay).toISOString(),
      href: '/routines',
      minutesBefore: 10,
    })
  }

  // ── Projects ending today ──
  const projects = await prisma.project.findMany({
    where: {
      userId: session.userId,
      endDate: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['completed', 'paused'] },
    },
    select: { id: true, title: true, endDate: true },
  })
  for (const p of projects) {
    if (!p.endDate) continue
    const dt = new Date(p.endDate)
    dt.setHours(9, 0, 0, 0)
    results.push({
      id: `project-${p.id}`,
      type: 'project',
      title: `[마감] ${p.title}`,
      dateTime: dt.toISOString(),
      href: '/projects',
      minutesBefore: 60,
    })
  }

  return results
}
