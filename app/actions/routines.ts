'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type RoutineFormState =
  | { success: true }
  | { errors: { title?: string[]; general?: string[] } }
  | undefined

function extractFields(formData: FormData) {
  const daysRaw = formData.get('daysOfWeek') as string
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string) || null,
    frequency: (formData.get('frequency') as 'daily' | 'weekly' | 'monthly' | 'custom') || 'daily',
    daysOfWeek: daysRaw ? JSON.parse(daysRaw) : null,
    timeOfDay: (formData.get('timeOfDay') as string) || null,
    color: (formData.get('color') as string) || '#6366F1',
    status: (formData.get('status') as 'active' | 'paused' | 'archived') || 'active',
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
  }
}

export async function createRoutine(state: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  const session = await verifySession()
  const f = extractFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.routine.create({
    data: {
      userId: session.userId,
      title: f.title,
      description: f.description,
      frequency: f.frequency,
      daysOfWeek: f.daysOfWeek,
      timeOfDay: f.timeOfDay,
      color: f.color,
      status: 'active',
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
    },
  })

  revalidatePath('/routines')
  return { success: true }
}

export async function updateRoutine(state: RoutineFormState, formData: FormData): Promise<RoutineFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const routine = await prisma.routine.findUnique({ where: { id } })
  if (!routine || routine.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.routine.update({
    where: { id },
    data: {
      title: f.title,
      description: f.description,
      frequency: f.frequency,
      daysOfWeek: f.daysOfWeek,
      timeOfDay: f.timeOfDay,
      color: f.color,
      status: f.status,
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
    },
  })

  revalidatePath('/routines')
  return { success: true }
}

export async function deleteRoutine(id: number) {
  const session = await verifySession()
  const routine = await prisma.routine.findUnique({ where: { id } })
  if (!routine || routine.userId !== session.userId) return
  await prisma.routine.delete({ where: { id } })
  revalidatePath('/routines')
}

export async function toggleRoutineLog(routineId: number, date: string, currentDone: boolean) {
  const session = await verifySession()
  const routine = await prisma.routine.findUnique({ where: { id: routineId } })
  if (!routine || routine.userId !== session.userId) return

  const logDate = new Date(date)

  if (currentDone) {
    await prisma.routineLog.deleteMany({ where: { routineId, logDate } })
  } else {
    await prisma.routineLog.upsert({
      where: { routineId_logDate: { routineId, logDate } },
      create: { routineId, userId: session.userId, logDate, done: true },
      update: { done: true },
    })
  }

  revalidatePath('/routines')
  revalidatePath('/tasks/today')
}
