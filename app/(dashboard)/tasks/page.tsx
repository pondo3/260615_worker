import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TaskList from '@/components/tasks/TaskList'

export default async function AllTasksPage() {
  const session = await verifySession()

  const [tasks, categories, projects, goals] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId },
      orderBy: [{ taskDate: 'desc' }, { importance: 'asc' }, { urgency: 'asc' }],
    }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({ where: { userId: session.userId, status: { in: ['planning', 'active'] } }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
    prisma.goal.findMany({ where: { userId: session.userId, status: 'active' }, orderBy: { title: 'asc' }, select: { id: true, title: true, color: true } }),
  ])

  const totalCount = tasks.length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="p-8">
      <TaskList
        tasks={tasks}
        title="전체 할일"
        description={`총 ${totalCount}개 · 완료 ${doneCount}개`}
        categories={categories}
        projects={projects}
        goals={goals}
      />
    </div>
  )
}
