'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { syncAttachments } from './attachments'
import { parseAttachmentsFromFormData } from '@/lib/parseAttachments'

export type ProjectFormState =
  | { success: true }
  | { errors: { title?: string[]; general?: string[] } }
  | undefined

function extractFields(formData: FormData) {
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    description: (formData.get('description') as string) || null,
    type: (formData.get('type') as 'work' | 'personal' | 'study' | 'other') || 'personal',
    status: (formData.get('status') as 'planning' | 'active' | 'completed' | 'paused') || 'planning',
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
    color: (formData.get('color') as string) || '#7C3AED',
  }
}

export async function createProject(state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const session = await verifySession()
  const f = extractFields(formData)

  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  const project = await prisma.project.create({
    data: {
      userId: session.userId,
      title: f.title,
      description: f.description,
      type: f.type,
      status: 'planning',
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
      color: f.color,
    },
  })

  await syncAttachments('project', project.id, session.userId, parseAttachmentsFromFormData(formData)).catch(() => {})
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProject(state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }

  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.project.update({
    where: { id },
    data: {
      title: f.title,
      description: f.description,
      type: f.type,
      status: f.status,
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
      color: f.color,
    },
  })

  await syncAttachments('project', id, session.userId, parseAttachmentsFromFormData(formData)).catch(() => {})
  revalidatePath('/projects')
  return { success: true }
}

export async function deleteProject(id: number) {
  const session = await verifySession()
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project || project.userId !== session.userId) return
  await prisma.project.delete({ where: { id } })
  revalidatePath('/projects')
}

