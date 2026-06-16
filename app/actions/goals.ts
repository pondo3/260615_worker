'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type GoalFormState =
  | { success: true }
  | { errors: { title?: string[]; startDate?: string[]; general?: string[] } }
  | undefined

function extractFields(formData: FormData) {
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string) || null,
    type: (formData.get('type') as 'yearly' | 'monthly' | 'weekly' | 'custom') || 'monthly',
    startDate: formData.get('startDate') as string,
    endDate: (formData.get('endDate') as string) || null,
    color: (formData.get('color') as string) || '#3B82F6',
    status: (formData.get('status') as 'active' | 'completed' | 'paused' | 'abandoned') || 'active',
    progress: Math.min(100, Math.max(0, Number(formData.get('progress')) || 0)),
  }
}

export async function createGoal(state: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const session = await verifySession()
  const f = extractFields(formData)

  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.startDate) return { errors: { startDate: ['시작일을 선택하세요.'] } }

  await prisma.goal.create({
    data: {
      userId: session.userId,
      title: f.title,
      description: f.description,
      type: f.type,
      status: 'active',
      startDate: new Date(f.startDate),
      endDate: f.endDate ? new Date(f.endDate) : null,
      color: f.color,
      progress: f.progress,
    },
  })

  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoal(state: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal || goal.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }

  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }
  if (!f.startDate) return { errors: { startDate: ['시작일을 선택하세요.'] } }

  await prisma.goal.update({
    where: { id },
    data: {
      title: f.title,
      description: f.description,
      type: f.type,
      status: f.status,
      startDate: new Date(f.startDate),
      endDate: f.endDate ? new Date(f.endDate) : null,
      color: f.color,
      progress: f.progress,
    },
  })

  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoal(id: number) {
  const session = await verifySession()
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal || goal.userId !== session.userId) return
  await prisma.goal.delete({ where: { id } })
  revalidatePath('/goals')
}
