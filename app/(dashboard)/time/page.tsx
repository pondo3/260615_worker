import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TimeManagementClient from '@/components/time/TimeManagementClient'
import { getTimeBlocks, getWeekTimeBlocks } from '@/app/actions/timeblocks'

type SearchParams = { date?: string; view?: string }

function parseDate(dateStr: string | undefined): string {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return dateStr
  }
  return new Date().toISOString().split('T')[0]
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const dow = d.getDay()
  const diff = (dow + 6) % 7 // 월요일 기준
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

export default async function TimePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await verifySession()
  const userId = session.userId

  const selectedDate = parseDate(searchParams.date)
  const weekStart = getWeekStart(selectedDate)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [timeBlocks, weekBlocks, todayTasks, routines, routineLogs, projects] = await Promise.all([
    getTimeBlocks(selectedDate),
    getWeekTimeBlocks(weekStart),

    // 오늘 미완료 할 일 (시간블록 배치 후보)
    prisma.task.findMany({
      where: {
        userId,
        taskDate: { gte: today, lt: tomorrow },
        status: { notIn: ['done', 'cancelled'] },
      },
      select: { id: true, title: true, importance: true, dueTime: true, estimatedMinutes: true },
      orderBy: [{ importance: 'asc' }, { sortOrder: 'asc' }],
    }),

    // 오늘 활성 루틴
    prisma.routine.findMany({
      where: { userId, status: 'active' },
      select: { id: true, title: true, timeOfDay: true, frequency: true, daysOfWeek: true, color: true },
      orderBy: { timeOfDay: 'asc' },
    }),

    // 오늘 루틴 완료 로그
    prisma.routineLog.findMany({
      where: { userId, logDate: { gte: today, lt: tomorrow }, done: true },
      select: { routineId: true },
    }),

    // 진행 중 프로젝트
    prisma.project.findMany({
      where: { userId, status: { in: ['planning', 'active'] } },
      select: { id: true, title: true, color: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ])

  const serialize = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

  const todayDow = new Date().getDay()
  const todayRoutines = routines.filter((r) => {
    if (r.frequency === 'daily') return true
    if (r.frequency === 'weekly' && Array.isArray(r.daysOfWeek)) {
      return (r.daysOfWeek as number[]).includes(todayDow)
    }
    return false
  })

  const doneRoutineIds = new Set(routineLogs.map((l) => l.routineId))

  return (
    <TimeManagementClient
      initialDate={selectedDate}
      initialView={(searchParams.view as 'today' | 'week' | 'list') ?? 'today'}
      timeBlocks={serialize(timeBlocks)}
      weekBlocks={serialize(weekBlocks)}
      weekStart={weekStart}
      todayTasks={serialize(todayTasks)}
      todayRoutines={serialize(todayRoutines)}
      doneRoutineIds={[...doneRoutineIds]}
      projects={serialize(projects)}
    />
  )
}
