import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import RoutineListClient from '@/components/routines/RoutineListClient'

export default async function RoutinesPage() {
  const session = await verifySession()

  const routines = await prisma.routine.findMany({
    where: { userId: session.userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  // 오늘 날짜
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // 오늘 완료 여부 맵
  const todayLogs = await prisma.routineLog.findMany({
    where: {
      userId: session.userId,
      logDate: { gte: todayStart, lte: todayEnd },
      done: true,
    },
    select: { routineId: true },
  })
  const logMap: Record<number, boolean> = {}
  for (const log of todayLogs) {
    logMap[log.routineId] = true
  }

  // 최근 30일 로그로 달성률·스트릭 계산
  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  since30.setHours(0, 0, 0, 0)

  const recentLogs = await prisma.routineLog.findMany({
    where: {
      userId: session.userId,
      logDate: { gte: since30 },
      done: true,
    },
    select: { routineId: true, logDate: true },
    orderBy: { logDate: 'desc' },
  })

  // statsMap: routineId → { total(30일 기준 예상 횟수), done, streak }
  const statsMap: Record<number, { total: number; done: number; streak: number }> = {}

  for (const r of routines) {
    const logs = recentLogs.filter((l) => l.routineId === r.id)
    const done = logs.length

    // 30일 기준 예상 횟수
    let total = 0
    if (r.frequency === 'daily') {
      total = 30
    } else if (r.frequency === 'weekly') {
      const days = (r.daysOfWeek as number[] | null) ?? []
      total = Math.round((30 / 7) * days.length)
    } else if (r.frequency === 'monthly') {
      total = 1
    } else {
      total = done > 0 ? done : 1
    }

    // 연속 일수 계산 (매일 기준)
    let streak = 0
    if (r.frequency === 'daily') {
      const logDates = new Set(logs.map((l) => l.logDate.toISOString().split('T')[0]))
      const check = new Date()
      check.setHours(0, 0, 0, 0)
      // 오늘 완료 안 했으면 어제부터
      const todayKey = check.toISOString().split('T')[0]
      if (!logDates.has(todayKey)) check.setDate(check.getDate() - 1)
      while (logDates.has(check.toISOString().split('T')[0])) {
        streak++
        check.setDate(check.getDate() - 1)
      }
    }

    statsMap[r.id] = { total, done, streak }
  }

  return (
    <RoutineListClient
      routines={routines.map((r) => ({
        ...r,
        daysOfWeek: r.daysOfWeek as number[] | null,
        startDate: r.startDate?.toISOString() ?? null,
        endDate: r.endDate?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      logMap={logMap}
      statsMap={statsMap}
    />
  )
}
