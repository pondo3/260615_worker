'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { fetchVideoViewCount, getActiveApiKey } from '@/lib/youtube-collect'

export type TestFormState =
  | { success: true }
  | { errors: { title?: string[]; general?: string[] } }
  | undefined

type LinkInput = { label: string; url: string; memo: string }

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/shorts\/([^?#]+)/,
    /youtube\.com\/embed\/([^?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
type SnapshotInput = { checkpoint: 'initial' | 'after_12h' | 'after_48h'; value: string; memo: string }

function extractFields(formData: FormData) {
  const linksRaw = formData.get('links') as string
  const snapshotsRaw = formData.get('snapshots') as string
  return {
    title: (formData.get('title') as string)?.trim() ?? '',
    platform: (formData.get('platform') as string) || 'other',
    customPlatform: (formData.get('customPlatform') as string) || null,
    testType: (formData.get('testType') as string) || 'other',
    customTestType: (formData.get('customTestType') as string) || null,
    targetName: (formData.get('targetName') as string) || null,
    startDate: (formData.get('startDate') as string) || null,
    endDate: (formData.get('endDate') as string) || null,
    purpose: (formData.get('purpose') as string) || null,
    hypothesis: (formData.get('hypothesis') as string) || null,
    method: (formData.get('method') as string) || null,
    conditions: (formData.get('conditions') as string) || null,
    successCriteria: (formData.get('successCriteria') as string) || null,
    preMemo: (formData.get('preMemo') as string) || null,
    primaryMetric: (formData.get('primaryMetric') as string) || '조회수',
    customPrimaryMetric: (formData.get('customPrimaryMetric') as string) || null,
    metricDirection: (formData.get('metricDirection') as 'higher_better' | 'lower_better') || 'higher_better',
    status: (formData.get('status') as 'planning' | 'in_progress' | 'recording' | 'completed' | 'on_hold') || 'planning',
    resultStatus: (formData.get('resultStatus') as 'success' | 'failure' | 'unclear' | 'pending' | '') || null,
    resultSummary: (formData.get('resultSummary') as string) || null,
    analysisMemo: (formData.get('analysisMemo') as string) || null,
    nextAction: (formData.get('nextAction') as string) || null,
    links: linksRaw ? (JSON.parse(linksRaw) as LinkInput[]) : [],
    snapshots: snapshotsRaw ? (JSON.parse(snapshotsRaw) as SnapshotInput[]) : [],
  }
}

export async function createTest(state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await verifySession()
  const f = extractFields(formData)
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  const test = await prisma.test.create({
    data: {
      userId: session.userId,
      title: f.title,
      platform: f.platform,
      customPlatform: f.customPlatform,
      testType: f.testType,
      customTestType: f.customTestType,
      targetName: f.targetName,
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
      purpose: f.purpose,
      hypothesis: f.hypothesis,
      method: f.method,
      conditions: f.conditions,
      successCriteria: f.successCriteria,
      preMemo: f.preMemo,
      primaryMetric: f.primaryMetric,
      customPrimaryMetric: f.customPrimaryMetric,
      metricDirection: f.metricDirection,
      status: 'planning',
    },
  })

  const validLinks = f.links.filter((l) => l.label || l.url)
  if (validLinks.length > 0) {
    await prisma.testLink.createMany({
      data: validLinks.map((l) => ({
        testId: test.id,
        label: l.label,
        url: l.url,
        videoId: extractYouTubeVideoId(l.url),
        memo: l.memo || null,
      })),
    })
  }

  // YouTube 링크가 있으면 등록 시점 조회수 자동 수집
  const firstVideoId = validLinks.map((l) => extractYouTubeVideoId(l.url)).find(Boolean)
  if (firstVideoId) {
    try {
      const apiKey = await getActiveApiKey(session.userId)
      if (apiKey) {
        const stats = await fetchVideoViewCount(firstVideoId, apiKey)
        if (stats) {
          await prisma.testMetricSnapshot.upsert({
            where: { testId_checkpoint: { testId: test.id, checkpoint: 'initial' } },
            create: { testId: test.id, checkpoint: 'initial', value: stats.viewCount, memo: '자동 수집' },
            update: { value: stats.viewCount, memo: '자동 수집' },
          })
        }
      }
    } catch {
      // 조회수 수집 실패해도 테스트 등록은 성공
    }
  }

  revalidatePath('/tests')
  return { success: true }
}

export async function updateTest(state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await verifySession()
  const id = Number(formData.get('id'))
  const f = extractFields(formData)

  const test = await prisma.test.findUnique({ where: { id } })
  if (!test || test.userId !== session.userId) return { errors: { general: ['권한이 없습니다.'] } }
  if (!f.title) return { errors: { title: ['제목을 입력하세요.'] } }

  await prisma.test.update({
    where: { id },
    data: {
      title: f.title,
      platform: f.platform,
      customPlatform: f.customPlatform,
      testType: f.testType,
      customTestType: f.customTestType,
      targetName: f.targetName,
      startDate: f.startDate ? new Date(f.startDate) : null,
      endDate: f.endDate ? new Date(f.endDate) : null,
      purpose: f.purpose,
      hypothesis: f.hypothesis,
      method: f.method,
      conditions: f.conditions,
      successCriteria: f.successCriteria,
      preMemo: f.preMemo,
      primaryMetric: f.primaryMetric,
      customPrimaryMetric: f.customPrimaryMetric,
      metricDirection: f.metricDirection,
      status: f.status,
      resultStatus: f.resultStatus || null,
      resultSummary: f.resultSummary,
      analysisMemo: f.analysisMemo,
      nextAction: f.nextAction,
    },
  })

  // 링크 교체
  await prisma.testLink.deleteMany({ where: { testId: id } })
  const validLinks2 = f.links.filter((l) => l.label || l.url)
  if (validLinks2.length > 0) {
    await prisma.testLink.createMany({
      data: validLinks2.map((l) => ({
        testId: id,
        label: l.label,
        url: l.url,
        videoId: extractYouTubeVideoId(l.url),
        memo: l.memo || null,
      })),
    })
  }

  // 스냅샷 upsert
  for (const s of f.snapshots) {
    const value = s.value !== '' ? parseFloat(s.value) : null
    await prisma.testMetricSnapshot.upsert({
      where: { testId_checkpoint: { testId: id, checkpoint: s.checkpoint } },
      create: { testId: id, checkpoint: s.checkpoint, value, memo: s.memo || null },
      update: { value, memo: s.memo || null },
    })
  }

  revalidatePath('/tests')
  return { success: true }
}

export async function deleteTest(id: number) {
  const session = await verifySession()
  const test = await prisma.test.findUnique({ where: { id } })
  if (!test || test.userId !== session.userId) return
  await prisma.test.delete({ where: { id } })
  revalidatePath('/tests')
}
