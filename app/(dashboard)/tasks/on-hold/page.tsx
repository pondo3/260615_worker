import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TaskList from '@/components/tasks/TaskList'

export default async function OnHoldTasksPage() {
  const session = await verifySession()

  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.userId, status: 'on_hold' },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="p-8">
      <TaskList
        tasks={tasks}
        title="보류한 일"
        description={`총 ${tasks.length}개 보류 중`}
        categories={categories}
        accent="amber"
        defaultFilter="on_hold"
      />
    </div>
  )
}
