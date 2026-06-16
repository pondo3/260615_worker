import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TaskList from '@/components/tasks/TaskList'

export default async function DoneTasksPage() {
  const session = await verifySession()

  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId, status: 'done' },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="p-8">
      <TaskList
        tasks={tasks}
        title="완료한 일"
        description={`총 ${tasks.length}개 완료`}
        categories={categories}
        accent="emerald"
        defaultFilter="done"
      />
    </div>
  )
}
