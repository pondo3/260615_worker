'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import type { TimeEntryType } from '@prisma/client'

export async function startTimer(data: {
  title: string
  taskId?: number | null
  projectId?: number | null
  categoryId?: number | null
  entryType?: TimeEntryType
}) {
  const session = await verifySession()

  // 이미 실행 중인 타이머가 있으면 먼저 정지
  const active = await prisma.timeEntry.findFirst({
    where: { userId: session.userId, endedAt: null },
  })
  if (active) {
    const now = new Date()
    const durationMin = Math.round((now.getTime() - active.startedAt.getTime()) / 60000)
    await prisma.timeEntry.update({
      where: { id: active.id },
      data: { endedAt: now, durationMin: Math.max(durationMin, 1) },
    })
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      title: data.title || '작업',
      taskId: data.taskId ?? null,
      projectId: data.projectId ?? null,
      categoryId: data.categoryId ?? null,
      entryType: data.entryType ?? 'work',
      startedAt: new Date(),
    },
  })

  revalidatePath('/time')
  return { id: entry.id }
}

export async function stopTimer(entryId: number) {
  const session = await verifySession()
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } })
  if (!entry || entry.userId !== session.userId) return

  const now = new Date()
  const durationMin = Math.round((now.getTime() - entry.startedAt.getTime()) / 60000)
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: { endedAt: now, durationMin: Math.max(durationMin, 1) },
  })

  revalidatePath('/time')
}

export async function cancelTimer(entryId: number) {
  const session = await verifySession()
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } })
  if (!entry || entry.userId !== session.userId) return

  await prisma.timeEntry.delete({ where: { id: entryId } })
  revalidatePath('/time')
}

export async function saveCompletedSession(data: {
  title: string
  taskId?: number | null
  projectId?: number | null
  categoryId?: number | null
  startedAt: string
  endedAt: string
  durationMin: number
  entryType: TimeEntryType
}) {
  const session = await verifySession()

  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      title: data.title || '포모도로',
      taskId: data.taskId ?? null,
      projectId: data.projectId ?? null,
      categoryId: data.categoryId ?? null,
      entryType: data.entryType,
      startedAt: new Date(data.startedAt),
      endedAt: new Date(data.endedAt),
      durationMin: Math.max(data.durationMin, 1),
    },
  })

  revalidatePath('/time')
}

export async function deleteTimeEntry(id: number) {
  const session = await verifySession()
  const entry = await prisma.timeEntry.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.userId) return

  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath('/time')
}

export async function updateTimeEntry(
  id: number,
  data: {
    title?: string
    memo?: string
    taskId?: number | null
    projectId?: number | null
    categoryId?: number | null
    startedAt?: string
    endedAt?: string
  }
) {
  const session = await verifySession()
  const entry = await prisma.timeEntry.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.userId) return

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.memo !== undefined) updateData.memo = data.memo
  if ('taskId' in data) updateData.taskId = data.taskId
  if ('projectId' in data) updateData.projectId = data.projectId
  if ('categoryId' in data) updateData.categoryId = data.categoryId

  if (data.startedAt) {
    updateData.startedAt = new Date(data.startedAt)
  }
  if (data.endedAt) {
    updateData.endedAt = new Date(data.endedAt)
  }
  if (data.startedAt || data.endedAt) {
    const start = new Date(data.startedAt ?? entry.startedAt)
    const end = new Date(data.endedAt ?? (entry.endedAt ?? new Date()))
    updateData.durationMin = Math.max(Math.round((end.getTime() - start.getTime()) / 60000), 1)
  }

  await prisma.timeEntry.update({ where: { id }, data: updateData })
  revalidatePath('/time')
}
