'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type AnalysisTask = {
  id: number
  title: string
  taskDate: string
  status: string
  categoryName: string | null
  categoryColor: string | null
}

export type AnalysisRoutineLog = {
  routineId: number
  routineTitle: string
  logDate: string
  done: boolean
}

export type AnalysisTimeEntry = {
  id: number
  startedAt: string
  durationMin: number
  entryType: string
  projectTitle: string | null
  categoryName: string | null
  categoryColor: string | null
}

export type AnalysisGoal = {
  id: number
  title: string
  type: string
  status: string
}

export type AnalysisData = {
  tasks: AnalysisTask[]
  routineLogs: AnalysisRoutineLog[]
  timeEntries: AnalysisTimeEntry[]
  goals: AnalysisGoal[]
}

export async function getAnalysisData(from: string, to: string): Promise<AnalysisData> {
  const session = await verifySession()
  const userId = session.userId

  const fromDate = new Date(from)
  fromDate.setHours(0, 0, 0, 0)
  const toDate = new Date(to)
  toDate.setHours(23, 59, 59, 999)

  const [tasks, routineLogs, timeEntries, goals] = await Promise.all([
    prisma.task.findMany({
      where: { userId, taskDate: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        title: true,
        taskDate: true,
        status: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { taskDate: 'asc' },
    }),
    prisma.routineLog.findMany({
      where: { userId, logDate: { gte: fromDate, lte: toDate } },
      select: {
        routineId: true,
        logDate: true,
        done: true,
        routine: { select: { title: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: { userId, startedAt: { gte: fromDate, lte: toDate }, endedAt: { not: null } },
      select: {
        id: true,
        startedAt: true,
        durationMin: true,
        entryType: true,
        project: { select: { title: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: { id: true, title: true, type: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      taskDate: t.taskDate.toISOString().split('T')[0],
      status: t.status,
      categoryName: t.category?.name ?? null,
      categoryColor: t.category?.color ?? null,
    })),
    routineLogs: routineLogs.map((l) => ({
      routineId: l.routineId,
      routineTitle: l.routine.title,
      logDate: l.logDate.toISOString().split('T')[0],
      done: l.done,
    })),
    timeEntries: timeEntries.map((e) => ({
      id: e.id,
      startedAt: e.startedAt.toISOString(),
      durationMin: e.durationMin ?? 0,
      entryType: e.entryType,
      projectTitle: e.project?.title ?? null,
      categoryName: e.category?.name ?? null,
      categoryColor: e.category?.color ?? null,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      status: g.status,
    })),
  }
}
