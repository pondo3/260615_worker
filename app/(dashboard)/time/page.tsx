import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TimeTracker from '@/components/time/TimeTracker'

type SearchParams = { date?: string }

function parseDate(dateStr: string | undefined): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0)
      return d
    }
  }
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default async function TimePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await verifySession()
  const userId = session.userId

  const selectedDate = parseDate(searchParams.date)
  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = selectedDate.toDateString() === today.toDateString()

  const [activeEntry, dateEntries, tasks, projects, categories] = await Promise.all([
    // 실행 중인 타이머 (항상 표시)
    prisma.timeEntry.findFirst({
      where: { userId, endedAt: null },
      include: { task: { select: { title: true } }, project: { select: { title: true } }, category: { select: { name: true, color: true } } },
    }),

    // 선택 날짜 완료 기록
    prisma.timeEntry.findMany({
      where: { userId, startedAt: { gte: selectedDate, lt: nextDay }, endedAt: { not: null } },
      include: { task: { select: { title: true } }, project: { select: { title: true } }, category: { select: { name: true, color: true } } },
      orderBy: { startedAt: 'desc' },
    }),

    // 할 일 목록 (최근 7일 미완료)
    prisma.task.findMany({
      where: { userId, taskDate: { gte: new Date(Date.now() - 7 * 86400000) }, status: { not: 'done' } },
      select: { id: true, title: true, taskDate: true, status: true },
      orderBy: { taskDate: 'desc' },
      take: 50,
    }),

    // 프로젝트 목록
    prisma.project.findMany({
      where: { userId, status: { in: ['planning', 'active'] } },
      select: { id: true, title: true, color: true },
      orderBy: { createdAt: 'desc' },
    }),

    // 카테고리 목록
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialize = (obj: unknown): any => JSON.parse(JSON.stringify(obj))

  return (
    <TimeTracker
      activeEntry={serialize(activeEntry)}
      todayEntries={serialize(dateEntries)}
      tasks={tasks.map((t) => ({ ...t, taskDate: t.taskDate.toISOString().split('T')[0] }))}
      projects={projects}
      categories={categories}
      selectedDate={selectedDate.toISOString().split('T')[0]}
      isToday={isToday}
    />
  )
}
