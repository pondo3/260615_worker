'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

// ─── 프로세스 ────────────────────────────────────────────────────────────────

export async function getProcesses() {
  const session = await verifySession()
  return prisma.process.findMany({
    where: { userId: session.userId },
    include: {
      steps: { orderBy: { order: 'asc' } },
      connections: true,
      _count: { select: { executions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createProcess(data: {
  title: string
  description?: string
  category?: string
  purpose?: string
  importance?: string
  tags?: string[]
  isTemplate?: boolean
  projectId?: number | null
}) {
  const session = await verifySession()
  const proc = await prisma.process.create({
    data: {
      userId: session.userId,
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      purpose: data.purpose || null,
      importance: data.importance ?? '보통',
      tags: data.tags ?? [],
      isTemplate: data.isTemplate ?? false,
      projectId: data.projectId ?? null,
    },
    include: { steps: true, connections: true, _count: { select: { executions: true } } },
  })
  revalidatePath('/processes')
  return proc
}

export async function updateProcess(id: number, data: {
  title?: string
  description?: string | null
  category?: string | null
  purpose?: string | null
  status?: 'active' | 'archived' | 'draft'
  importance?: string
  tags?: string[]
  isTemplate?: boolean
  isFavorite?: boolean
  projectId?: number | null
}) {
  const session = await verifySession()
  await prisma.process.updateMany({
    where: { id, userId: session.userId },
    data: {
      ...data,
      tags: data.tags ?? undefined,
    },
  })
  revalidatePath('/processes')
}

export async function deleteProcess(id: number) {
  const session = await verifySession()
  await prisma.process.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/processes')
}

export async function toggleFavorite(id: number, isFavorite: boolean) {
  const session = await verifySession()
  await prisma.process.updateMany({ where: { id, userId: session.userId }, data: { isFavorite } })
  revalidatePath('/processes')
}

// ─── 단계 ────────────────────────────────────────────────────────────────────

export async function createStep(processId: number, data: {
  title: string
  description?: string
  order?: number
  estimatedMinutes?: number | null
  completionCondition?: string
  memo?: string
}) {
  const session = await verifySession()
  const proc = await prisma.process.findFirst({ where: { id: processId, userId: session.userId } })
  if (!proc) throw new Error('권한 없음')

  const maxOrder = await prisma.processStep.aggregate({
    where: { processId },
    _max: { order: true },
  })
  const newOrder = (maxOrder._max.order ?? -1) + 1

  const step = await prisma.processStep.create({
    data: {
      processId,
      title: data.title,
      description: data.description || null,
      order: data.order ?? newOrder,
      estimatedMinutes: data.estimatedMinutes ?? null,
      completionCondition: data.completionCondition || null,
      memo: data.memo || null,
      checklist: [],
      relatedLinks: [],
    },
  })
  revalidatePath('/processes')
  return step
}

export async function updateStep(id: number, data: {
  title?: string
  description?: string | null
  order?: number
  status?: 'pending' | 'in_progress' | 'review' | 'completed' | 'on_hold'
  checklist?: Array<{ text: string; done: boolean }>
  estimatedMinutes?: number | null
  completionCondition?: string | null
  relatedLinks?: Array<{ title: string; url: string }>
  memo?: string | null
  posX?: number | null
  posY?: number | null
}) {
  const session = await verifySession()
  const step = await prisma.processStep.findFirst({
    where: { id },
    include: { process: { select: { userId: true } } },
  })
  if (!step || step.process.userId !== session.userId) throw new Error('권한 없음')

  await prisma.processStep.update({
    where: { id },
    data: {
      ...data,
      checklist: data.checklist ?? undefined,
      relatedLinks: data.relatedLinks ?? undefined,
    },
  })
  revalidatePath('/processes')
}

export async function deleteStep(id: number) {
  const session = await verifySession()
  const step = await prisma.processStep.findFirst({
    where: { id },
    include: { process: { select: { userId: true } } },
  })
  if (!step || step.process.userId !== session.userId) throw new Error('권한 없음')
  await prisma.processStep.delete({ where: { id } })
  revalidatePath('/processes')
}

export async function reorderSteps(processId: number, orderedIds: number[]) {
  const session = await verifySession()
  const proc = await prisma.process.findFirst({ where: { id: processId, userId: session.userId } })
  if (!proc) throw new Error('권한 없음')

  await Promise.all(
    orderedIds.map((stepId, index) =>
      prisma.processStep.update({ where: { id: stepId }, data: { order: index } })
    )
  )
  revalidatePath('/processes')
}

// ─── 연결 ────────────────────────────────────────────────────────────────────

export async function createConnection(processId: number, fromStepId: number, toStepId: number, type: 'sequential' | 'parallel' | 'conditional' = 'sequential', label?: string) {
  const session = await verifySession()
  const proc = await prisma.process.findFirst({ where: { id: processId, userId: session.userId } })
  if (!proc) throw new Error('권한 없음')

  const conn = await prisma.processStepConnection.upsert({
    where: { fromStepId_toStepId: { fromStepId, toStepId } },
    create: { processId, fromStepId, toStepId, type, label: label ?? null },
    update: { type, label: label ?? null },
  })
  revalidatePath('/processes')
  return conn
}

export async function deleteConnection(id: number) {
  const session = await verifySession()
  const conn = await prisma.processStepConnection.findFirst({
    where: { id },
    include: { process: { select: { userId: true } } },
  })
  if (!conn || conn.process.userId !== session.userId) throw new Error('권한 없음')
  await prisma.processStepConnection.delete({ where: { id } })
  revalidatePath('/processes')
}

// ─── 실행 ────────────────────────────────────────────────────────────────────

export async function startExecution(processId: number) {
  const session = await verifySession()
  const proc = await prisma.process.findFirst({
    where: { id: processId, userId: session.userId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })
  if (!proc) throw new Error('권한 없음')

  const execution = await prisma.processExecution.create({
    data: {
      processId,
      userId: session.userId,
      stepExecutions: {
        create: proc.steps.map((s) => ({ stepId: s.id, status: 'pending' })),
      },
    },
    include: { stepExecutions: true },
  })

  await prisma.process.update({ where: { id: processId }, data: { lastUsedAt: new Date() } })
  revalidatePath('/processes')
  return execution
}

export async function updateExecutionStep(executionStepId: number, status: 'pending' | 'in_progress' | 'completed') {
  const session = await verifySession()
  const es = await prisma.processExecutionStep.findFirst({
    where: { id: executionStepId },
    include: { execution: { select: { userId: true, id: true } } },
  })
  if (!es || es.execution.userId !== session.userId) throw new Error('권한 없음')

  await prisma.processExecutionStep.update({
    where: { id: executionStepId },
    data: { status, completedAt: status === 'completed' ? new Date() : null },
  })

  // 모두 완료되면 execution 완료 처리
  const allSteps = await prisma.processExecutionStep.findMany({ where: { executionId: es.execution.id } })
  const allDone = allSteps.every((s) => s.id === executionStepId ? status === 'completed' : s.status === 'completed')
  if (allDone) {
    await prisma.processExecution.update({ where: { id: es.execution.id }, data: { status: 'completed', completedAt: new Date() } })
  }
  revalidatePath('/processes')
}

export async function completeExecution(executionId: number) {
  const session = await verifySession()
  const exec = await prisma.processExecution.findFirst({ where: { id: executionId, userId: session.userId } })
  if (!exec) throw new Error('권한 없음')
  await prisma.processExecution.update({ where: { id: executionId }, data: { status: 'completed', completedAt: new Date() } })
  revalidatePath('/processes')
}

export async function getExecutionHistory(processId: number) {
  const session = await verifySession()
  return prisma.processExecution.findMany({
    where: { processId, userId: session.userId },
    include: { stepExecutions: true },
    orderBy: { startedAt: 'desc' },
    take: 10,
  })
}

// ─── 노드 위치 저장 ──────────────────────────────────────────────────────────

export async function saveNodePosition(stepId: number, posX: number, posY: number) {
  const session = await verifySession()
  const step = await prisma.processStep.findFirst({
    where: { id: stepId },
    include: { process: { select: { userId: true } } },
  })
  if (!step || step.process.userId !== session.userId) return
  await prisma.processStep.update({ where: { id: stepId }, data: { posX, posY } })
}
