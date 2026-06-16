'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export type ApiKeyFormState =
  | { success: true }
  | { errors: { label?: string[]; keyValue?: string[]; general?: string[] } }
  | undefined

export async function createApiKey(state: ApiKeyFormState, formData: FormData): Promise<ApiKeyFormState> {
  const session = await verifySession()
  const label = (formData.get('label') as string)?.trim()
  const keyValue = (formData.get('keyValue') as string)?.trim()
  const service = (formData.get('service') as string) || 'youtube'
  const sortOrder = Number(formData.get('sortOrder') ?? 0)

  if (!label) return { errors: { label: ['이름을 입력하세요.'] } }
  if (!keyValue) return { errors: { keyValue: ['API 키를 입력하세요.'] } }

  const existing = await prisma.apiKey.findFirst({
    where: { userId: session.userId, service, keyValue },
  })
  if (existing) return { errors: { keyValue: ['이미 등록된 API 키입니다.'] } }

  await prisma.apiKey.create({
    data: { userId: session.userId, service, label, keyValue, sortOrder },
  })

  revalidatePath('/settings/api')
  return { success: true }
}

export async function deleteApiKey(id: number) {
  const session = await verifySession()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.userId) return
  await prisma.apiKey.delete({ where: { id } })
  revalidatePath('/settings/api')
}

export async function toggleApiKeyActive(id: number) {
  const session = await verifySession()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.userId) return
  await prisma.apiKey.update({ where: { id }, data: { isActive: !key.isActive } })
  revalidatePath('/settings/api')
}

export async function resetApiKeyQuota(id: number) {
  const session = await verifySession()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.userId) return
  await prisma.apiKey.update({ where: { id }, data: { quotaExceeded: false, lastError: null } })
  revalidatePath('/settings/api')
}

export async function updateApiKeyMeta(id: number, label: string, sortOrder: number) {
  const session = await verifySession()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.userId) return
  if (!label.trim()) return
  await prisma.apiKey.update({ where: { id }, data: { label: label.trim(), sortOrder } })
  revalidatePath('/settings/api')
}

export async function testApiKey(id: number): Promise<{ success: boolean; message: string }> {
  const session = await verifySession()
  const key = await prisma.apiKey.findUnique({ where: { id } })
  if (!key || key.userId !== session.userId) return { success: false, message: '권한이 없습니다.' }

  const testVideoId = 'dQw4w9WgXcQ' // Rick Astley - 항상 공개된 영상
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${testVideoId}&key=${key.keyValue}&part=snippet`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const reason = errData?.error?.errors?.[0]?.reason as string | undefined
      let message = ''
      if (reason === 'quotaExceeded') message = '할당량이 초과되었습니다. (quotaExceeded)'
      else if (reason === 'keyInvalid' || res.status === 400) message = 'API 키가 잘못되었습니다. (keyInvalid)'
      else if (res.status === 403) message = 'API 키 권한이 없습니다. YouTube Data API v3가 활성화되어 있는지 확인하세요.'
      else message = `오류가 발생했습니다. (${res.status})`

      await prisma.apiKey.update({ where: { id }, data: { lastError: message } })
      revalidatePath('/settings/api')
      return { success: false, message }
    }

    const data = await res.json()
    if (!data.items?.length) {
      return { success: false, message: '테스트 영상 정보를 가져오지 못했습니다.' }
    }

    await prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date(), lastError: null } })
    revalidatePath('/settings/api')
    return { success: true, message: '정상 작동합니다!' }
  } catch {
    return { success: false, message: '네트워크 오류가 발생했습니다.' }
  }
}
