import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TaskList from '@/components/tasks/TaskList'

export default async function TomorrowTasksPage() {
  const session = await verifySession()

  // KST(UTC+9) 기준 내일 날짜 계산
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayKST = nowKST.toISOString().split('T')[0]   // 'YYYY-MM-DD' (KST 기준)
  const today = new Date(todayKST + 'T00:00:00.000Z')
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowKST = tomorrow.toISOString().split('T')[0]

  const [tasks, categories, projects, goals] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId, taskDate: { gte: tomorrow, lt: dayAfter } },
      orderBy: [{ status: 'asc' }, { importance: 'asc' }, { urgency: 'asc' }],
    }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { userId: session.userId, status: { in: ['planning', 'active'] } }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
    prisma.goal.findMany({ where: { userId: session.userId, status: 'active' }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
  ])

  const dateStr = new Date(tomorrowKST).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'UTC',
  })

  return (
    <div className="p-8">
      <TaskList
        tasks={tasks}
        defaultDate={tomorrowKST}
        title="내일 할 일"
        description={dateStr}
        categories={categories}
        projects={projects}
        goals={goals}
        accent="violet"
        showMoveToToday
      />
    </div>
  )
}
