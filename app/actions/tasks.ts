'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { syncAttachments } from './attachments'
import { parseAttachmentsFromFormData } from '@/lib/parseAttachments'

export type TaskFormState =
  | { success: true }
  | { errors: { title?: string[]; taskDate?: string[]; general?: string[] } }
  | undefined

function parseChecklist(raw: string | null) {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function extractTaskFields(formData: FormData) {
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    taskDate: formData.get('taskDate') as string,
    description: (formData.get('description') as string) || null,
    color: (formData.get('color') as string) || '#FFFFFF',
    dueTime: (formData.get('dueTime') as string) || null,
    importance: (formData.get('importance') as 'high' | 'medium' | 'low') || 'medium',
    urgency: (formData.get('urgency') as 'high' | 'medium' | 'low') || 'medium',
    categoryId: formData.get('categoryId') ? Number(formData.get('categoryId')) : null,
    estimatedMinutes: formData.get('estimatedMinutes') ? Number(formData.get('estimatedMinutes')) : null,
    checklist: parseChecklist(formData.get('checklist') as string | null),
    projectName: (formData.get('projectName') as string)?.trim() || null,
    goalName: (formData.get('goalName') as string)?.trim() || null,
    projectId: formData.get('projectId') ? Number(formData.get('projectId')) : null,
    goalId: formData.get('goalId') ? Number(formData.get('goalId')) : null,
  }
}

export async function createTask(state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const session = await verifySession()
  const fields = extractTaskFields(formData)

  if (!fields.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!fields.taskDate) return { errors: { taskDate: ['날짜를 선택하세요.'] } }

  const task = await prisma.task.create({
    data: {
      userId: session.userId,
      title: fields.title,
      description: fields.description,
      color: fields.color,
      taskDate: new Date(fields.taskDate),
      dueTime: fields.dueTime,
      importance: fields.importance,
      urgency: fields.urgency,
      status: 'pending',
      categoryId: fields.categoryId,
      estimatedMinutes: fields.estimatedMinutes,
      checklist: fields.checklist ?? undefined,
      projectName: fields.projectName,
      goalName: fields.goalName,
      projectId: fields.projectId,
      goalId: fields.goalId,
    },
  })

  await syncAttachments('task', task.id, session.userId, parseAttachmentsFromFormData(formData)).catch(() => {})
  revalidatePath('/tasks/today')
  revalidatePath('/tasks/tomorrow')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTask(state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const fields = extractTaskFields(formData)

  if (!fields.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!fields.taskDate) return { errors: { taskDate: ['날짜를 선택하세요.'] } }

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.userId) {
    return { errors: { general: ['권한이 없습니다.'] } }
  }

  await prisma.task.update({
    where: { id },
    data: {
      title: fields.title,
      description: fields.description,
      color: fields.color,
      taskDate: new Date(fields.taskDate),
      dueTime: fields.dueTime,
      importance: fields.importance,
      urgency: fields.urgency,
      status: (formData.get('status') as 'pending' | 'in_progress' | 'done' | 'on_hold' | 'cancelled') || task.status,
      categoryId: fields.categoryId,
      estimatedMinutes: fields.estimatedMinutes,
      checklist: fields.checklist ?? undefined,
      projectName: fields.projectName,
      goalName: fields.goalName,
      projectId: fields.projectId,
      goalId: fields.goalId,
    },
  })

  await syncAttachments('task', id, session.userId, parseAttachmentsFromFormData(formData)).catch(() => {})
  revalidatePath('/tasks/today')
  revalidatePath('/tasks/tomorrow')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTask(id: number) {
  const session = await verifySession()
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.userId) return
  await prisma.task.delete({ where: { id } })
  revalidatePath('/tasks/today')
  revalidatePath('/tasks/tomorrow')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

export async function toggleTaskDone(id: number, isDone: boolean) {
  const session = await verifySession()
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.userId) return
  await prisma.task.update({
    where: { id },
    data: { status: isDone ? 'done' : 'pending' },
  })
  revalidatePath('/tasks/today')
  revalidatePath('/tasks/tomorrow')
  revalidatePath('/tasks')
  revalidatePath('/tasks/done')
  revalidatePath('/dashboard')
}

export async function moveTaskToToday(id: number) {
  const session = await verifySession()
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== session.userId) return
  const kstStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date(kstStr + 'T00:00:00.000Z')
  await prisma.task.update({
    where: { id },
    data: { taskDate: today },
  })
  revalidatePath('/tasks/today')
  revalidatePath('/tasks/tomorrow')
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

