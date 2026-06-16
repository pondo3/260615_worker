import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import GoalListClient from '@/components/goals/GoalListClient'

export default async function GoalsPage() {
  const session = await verifySession()

  const goals = await prisma.goal.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: 'asc' }, { endDate: 'asc' }, { createdAt: 'desc' }],
  })

  // 목표별 할 일 진행률 계산 (goalName 매칭)
  const goalTitles = goals.map((g) => g.title).filter(Boolean)
  const linkedTasks =
    goalTitles.length > 0
      ? await prisma.task.findMany({
          where: {
            userId: session.userId,
            goalName: { in: goalTitles, mode: 'insensitive' },
          },
          select: { goalName: true, status: true },
        })
      : []

  // title(소문자) → { total, done }
  const progressMap: Record<string, { total: number; done: number }> = {}
  for (const t of linkedTasks) {
    const key = (t.goalName ?? '').toLowerCase()
    if (!progressMap[key]) progressMap[key] = { total: 0, done: 0 }
    progressMap[key].total++
    if (t.status === 'done') progressMap[key].done++
  }

  return (
    <GoalListClient
      goals={goals.map((g) => ({
        ...g,
        startDate: g.startDate.toISOString(),
        endDate: g.endDate?.toISOString() ?? null,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
        progress: g.progress,
      }))}
      progressMap={progressMap}
    />
  )
}
