'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type VideoLinkInput = {
  url: string
  title?: string | null
  thumbnailUrl?: string | null
  channelName?: string | null
  duration?: string | null
  memo?: string | null
}

export type RecordInput = {
  title: string
  date: string
  type: string
  content?: string | null
  tags: string[]
  videoLinks: VideoLinkInput[]
}

export async function createRecord(input: RecordInput): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession()
    await prisma.record.create({
      data: {
        userId: session.userId,
        title: input.title.trim(),
        date: new Date(input.date),
        type: input.type,
        content: input.content?.trim() || null,
        tags: input.tags,
        videoLinks: {
          create: input.videoLinks.map((v, i) => ({
            url: v.url,
            title: v.title || null,
            thumbnailUrl: v.thumbnailUrl || null,
            channelName: v.channelName || null,
            duration: v.duration || null,
            memo: v.memo || null,
            sortOrder: i,
          })),
        },
      },
    })
    revalidatePath('/records')
    return { success: true }
  } catch {
    return { success: false, error: '기록 저장에 실패했습니다.' }
  }
}

export async function updateRecord(id: number, input: RecordInput): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession()
    const existing = await prisma.record.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return { success: false, error: '권한이 없습니다.' }
    }
    await prisma.recordVideoLink.deleteMany({ where: { recordId: id } })
    await prisma.record.update({
      where: { id },
      data: {
        title: input.title.trim(),
        date: new Date(input.date),
        type: input.type,
        content: input.content?.trim() || null,
        tags: input.tags,
        videoLinks: {
          create: input.videoLinks.map((v, i) => ({
            url: v.url,
            title: v.title || null,
            thumbnailUrl: v.thumbnailUrl || null,
            channelName: v.channelName || null,
            duration: v.duration || null,
            memo: v.memo || null,
            sortOrder: i,
          })),
        },
      },
    })
    revalidatePath('/records')
    return { success: true }
  } catch {
    return { success: false, error: '기록 수정에 실패했습니다.' }
  }
}

export async function deleteRecord(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifySession()
    const existing = await prisma.record.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return { success: false, error: '권한이 없습니다.' }
    }
    await prisma.record.delete({ where: { id } })
    revalidatePath('/records')
    return { success: true }
  } catch {
    return { success: false, error: '기록 삭제에 실패했습니다.' }
  }
}
