'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type ExperimentFormState =
  | { success: true }
  | { errors: { title?: string[]; general?: string[] } }
  | undefined

function extractFields(formData: FormData) {
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    purpose: (formData.get('purpose') as string) || null,
    hypothesis: (formData.get('hypothesis') as string) || null,
    method: (formData.get('method') as string) || null,
    testDate: (formData.get('testDate') as string) || null,
    conditions: (formData.get('conditions') as string) || null,
    content: (formData.get('content') as string) || null,
    result: (formData.get('result') as string) || null,
    problems: (formData.get('problems') as string) || null,
    improvements: (formData.get('improvements') as string) || null,
    nextAction: (formData.get('nextAction') as string) || null,
    relatedLinks: (formData.get('relatedLinks') as string) || null,
    memo: (formData.get('memo') as string) || null,
    status: (formData.get('status') as 'in_progress' | 'success' | 'failure' | 'on_hold') || 'in_progress',
  }
}

export async function createExperiment(state: ExperimentFormState, formData: FormData): Promise<ExperimentFormState> {
  const session = await verifySession()
  const f = extractFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.experiment.create({
    data: {
      userId: session.userId,
      title: f.title,
      purpose: f.purpose,
      hypothesis: f.hypothesis,
      method: f.method,
      testDate: f.testDate ? new Date(f.testDate) : null,
      conditions: f.conditions,
      status: 'in_progress',
    },
  })

  revalidatePath('/tests')
  return { success: true }
}

export async function updateExperiment(state: ExperimentFormState, formData: FormData): Promise<ExperimentFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const exp = await prisma.experiment.findUnique({ where: { id } })
  if (!exp || exp.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.experiment.update({
    where: { id },
    data: {
      title: f.title,
      purpose: f.purpose,
      hypothesis: f.hypothesis,
      method: f.method,
      testDate: f.testDate ? new Date(f.testDate) : null,
      conditions: f.conditions,
      content: f.content,
      result: f.result,
      problems: f.problems,
      improvements: f.improvements,
      nextAction: f.nextAction,
      relatedLinks: f.relatedLinks,
      memo: f.memo,
      status: f.status,
    },
  })

  revalidatePath('/tests')
  return { success: true }
}

export async function deleteExperiment(id: number) {
  const session = await verifySession()
  const exp = await prisma.experiment.findUnique({ where: { id } })
  if (!exp || exp.userId !== session.userId) return
  await prisma.experiment.delete({ where: { id } })
  revalidatePath('/tests')
}

export async function addExperimentLog(experimentId: number, logType: 'status_change' | 'result_update' | 'note', note: string) {
  const session = await verifySession()
  const exp = await prisma.experiment.findUnique({ where: { id: experimentId } })
  if (!exp || exp.userId !== session.userId) return

  await prisma.experimentLog.create({
    data: { experimentId, userId: session.userId, logType, note: note || null },
  })

  revalidatePath('/tests')
}
