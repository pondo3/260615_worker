'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export type TimeBlockInput = {
  title: string
  date: string           // "YYYY-MM-DD"
  startTime: string      // "HH:MM"
  endTime: string        // "HH:MM"
  blockType?: string
  importance?: string
  status?: string
  memo?: string
  alertEnabled?: boolean
  alertMinutes?: number
  taskId?: number | null
  projectId?: number | null
  routineId?: number | null
  color?: string
}

export type TimeBlockWithRefs = {
  id: number
  userId: number
  title: string
  date: string
  startTime: string
  endTime: string
  blockType: string
  importance: string
  status: string
  memo: string | null
  alertEnabled: boolean
  alertMinutes: number
  taskId: number | null
  projectId: number | null
  routineId: number | null
  actualStart: string | null
  actualEnd: string | null
  color: string
  createdAt: string
  updatedAt: string
  task: { id: number; title: string } | null
  project: { id: number; title: string; color: string } | null
  routine: { id: number; title: string } | null
}

function toDateOnly(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function calcDurationMin(start: string, end: string): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start))
}

export async function getTimeBlocks(date: string): Promise<TimeBlockWithRefs[]> {
  const session = await verifySession()
  const d = toDateOnly(date)
  const next = new Date(d)
  next.setDate(next.getDate() + 1)

  const rows = await prisma.timeBlock.findMany({
    where: { userId: session.userId, date: { gte: d, lt: next } },
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true, color: true } },
      routine: { select: { id: true, title: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  return rows.map((r) => ({
    ...r,
    date: r.date.toISOString().split('T')[0],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    task: r.task,
    project: r.project,
    routine: r.routine,
  }))
}

export async function getWeekTimeBlocks(weekStart: string): Promise<TimeBlockWithRefs[]> {
  const session = await verifySession()
  const start = toDateOnly(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const rows = await prisma.timeBlock.findMany({
    where: { userId: session.userId, date: { gte: start, lt: end } },
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true, color: true } },
      routine: { select: { id: true, title: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  return rows.map((r) => ({
    ...r,
    date: r.date.toISOString().split('T')[0],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    task: r.task,
    project: r.project,
    routine: r.routine,
  }))
}

export async function createTimeBlock(data: TimeBlockInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await verifySession()
    await prisma.timeBlock.create({
      data: {
        userId: session.userId,
        title: data.title.trim(),
        date: toDateOnly(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        blockType: data.blockType ?? '기타',
        importance: data.importance ?? 'medium',
        status: data.status ?? 'planned',
        memo: data.memo?.trim() || null,
        alertEnabled: data.alertEnabled ?? false,
        alertMinutes: data.alertMinutes ?? 10,
        taskId: data.taskId ?? null,
        projectId: data.projectId ?? null,
        routineId: data.routineId ?? null,
        color: data.color ?? BLOCK_TYPE_COLORS[data.blockType ?? '기타'] ?? '#6366F1',
      },
    })
    revalidatePath('/time')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '저장 실패' }
  }
}

export async function updateTimeBlock(
  id: number,
  data: Partial<TimeBlockInput> & { actualStart?: string | null; actualEnd?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await verifySession()
    const existing = await prisma.timeBlock.findFirst({ where: { id, userId: session.userId } })
    if (!existing) return { ok: false, error: '권한 없음' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {}
    if (data.title !== undefined) payload.title = data.title.trim()
    if (data.date !== undefined) payload.date = toDateOnly(data.date)
    if (data.startTime !== undefined) payload.startTime = data.startTime
    if (data.endTime !== undefined) payload.endTime = data.endTime
    if (data.blockType !== undefined) payload.blockType = data.blockType
    if (data.importance !== undefined) payload.importance = data.importance
    if (data.status !== undefined) payload.status = data.status
    if (data.memo !== undefined) payload.memo = data.memo?.trim() || null
    if (data.alertEnabled !== undefined) payload.alertEnabled = data.alertEnabled
    if (data.alertMinutes !== undefined) payload.alertMinutes = data.alertMinutes
    if ('taskId' in data) payload.taskId = data.taskId ?? null
    if ('projectId' in data) payload.projectId = data.projectId ?? null
    if ('routineId' in data) payload.routineId = data.routineId ?? null
    if (data.color !== undefined) payload.color = data.color
    if ('actualStart' in data) payload.actualStart = data.actualStart ?? null
    if ('actualEnd' in data) payload.actualEnd = data.actualEnd ?? null

    await prisma.timeBlock.update({ where: { id }, data: payload })
    revalidatePath('/time')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '수정 실패' }
  }
}

export async function deleteTimeBlock(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await verifySession()
    await prisma.timeBlock.deleteMany({ where: { id, userId: session.userId } })
    revalidatePath('/time')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '삭제 실패' }
  }
}

export async function toggleTimeBlockDone(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await verifySession()
    const block = await prisma.timeBlock.findFirst({ where: { id, userId: session.userId } })
    if (!block) return { ok: false, error: '권한 없음' }
    const newStatus = block.status === 'done' ? 'planned' : 'done'
    await prisma.timeBlock.update({ where: { id }, data: { status: newStatus } })
    revalidatePath('/time')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '오류' }
  }
}

export const BLOCK_TYPES = [
  '업무', '개인', '루틴', '프로젝트', '콘텐츠 제작',
  '블로그 작업', '유튜브 작업', '개발 작업', '휴식', '기타',
] as const

export const BLOCK_TYPE_COLORS: Record<string, string> = {
  '업무': '#3B82F6',
  '개인': '#10B981',
  '루틴': '#F59E0B',
  '프로젝트': '#8B5CF6',
  '콘텐츠 제작': '#EF4444',
  '블로그 작업': '#EC4899',
  '유튜브 작업': '#F97316',
  '개발 작업': '#6366F1',
  '휴식': '#6B7280',
  '기타': '#64748B',
}
