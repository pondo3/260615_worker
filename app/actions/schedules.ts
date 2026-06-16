'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type ScheduleFormState =
  | { success: true }
  | { errors: { title?: string[]; scheduleDate?: string[]; general?: string[] } }
  | undefined

function extractFields(formData: FormData) {
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string) || null,
    scheduleDate: (formData.get('scheduleDate') as string) || '',
    endDate: (formData.get('endDate') as string) || null,
    startTime: (formData.get('startTime') as string) || null,
    endTime: (formData.get('endTime') as string) || null,
    isAllDay: formData.get('isAllDay') === 'true',
    eventType: (formData.get('eventType') as string) || '일반',
    status: (formData.get('status') as string) || '예정',
    priority: (formData.get('priority') as string) || '보통',
    color: (formData.get('color') as string) || '#0EA5E9',
    notification: formData.get('notification') === 'true',
    categoryId: formData.get('categoryId') ? Number(formData.get('categoryId')) : null,
    projectId: formData.get('projectId') ? Number(formData.get('projectId')) : null,
  }
}

export async function createSchedule(state: ScheduleFormState, formData: FormData): Promise<ScheduleFormState> {
  const session = await verifySession()
  const f = extractFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.scheduleDate) return { errors: { scheduleDate: ['날짜를 선택하세요.'] } }

  await prisma.schedule.create({
    data: {
      userId: session.userId,
      title: f.title,
      description: f.description,
      scheduleDate: new Date(f.scheduleDate),
      endDate: f.endDate ? new Date(f.endDate) : null,
      startTime: f.isAllDay ? null : (f.startTime || null),
      endTime: f.isAllDay ? null : (f.endTime || null),
      isAllDay: f.isAllDay,
      eventType: f.eventType,
      status: f.status,
      priority: f.priority,
      color: f.color,
      notification: f.notification,
      categoryId: f.categoryId,
      projectId: f.projectId,
    },
  })

  revalidatePath('/schedules')
  return { success: true }
}

export async function updateSchedule(state: ScheduleFormState, formData: FormData): Promise<ScheduleFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule || schedule.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.scheduleDate) return { errors: { scheduleDate: ['날짜를 선택하세요.'] } }

  const completedAt = f.status === '완료' && schedule.status !== '완료'
    ? new Date()
    : f.status !== '완료'
      ? null
      : schedule.completedAt

  await prisma.schedule.update({
    where: { id },
    data: {
      title: f.title,
      description: f.description,
      scheduleDate: new Date(f.scheduleDate),
      endDate: f.endDate ? new Date(f.endDate) : null,
      startTime: f.isAllDay ? null : (f.startTime || null),
      endTime: f.isAllDay ? null : (f.endTime || null),
      isAllDay: f.isAllDay,
      eventType: f.eventType,
      status: f.status,
      priority: f.priority,
      color: f.color,
      notification: f.notification,
      categoryId: f.categoryId,
      projectId: f.projectId,
      completedAt,
    },
  })

  revalidatePath('/schedules')
  return { success: true }
}

export async function updateScheduleStatus(id: number, status: string) {
  const session = await verifySession()
  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule || schedule.userId !== session.userId) return

  await prisma.schedule.update({
    where: { id },
    data: {
      status,
      completedAt: status === '완료' ? new Date() : null,
    },
  })
  revalidatePath('/schedules')
}

export async function deleteSchedule(id: number) {
  const session = await verifySession()
  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule || schedule.userId !== session.userId) return
  await prisma.schedule.delete({ where: { id } })
  revalidatePath('/schedules')
}
