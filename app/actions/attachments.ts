'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { del } from '@vercel/blob'

export type AttachmentItem = {
  dbId?: number
  tempId: string
  filename: string
  url: string
  size: number
  mimeType: string
  uploading?: boolean
}

export async function getAttachments(entityType: string, entityId: number): Promise<AttachmentItem[]> {
  const session = await verifySession()
  const rows = await prisma.attachment.findMany({
    where: { entityType, entityId, userId: session.userId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((a) => ({
    dbId: a.id,
    tempId: String(a.id),
    filename: a.filename,
    url: a.url,
    size: a.size,
    mimeType: a.mimeType,
  }))
}

export async function syncAttachments(
  entityType: string,
  entityId: number,
  userId: number,
  incoming: AttachmentItem[]
) {
  const existing = await prisma.attachment.findMany({
    where: { entityType, entityId, userId },
  })

  const incomingUrls = new Set(incoming.map((a) => a.url))

  // Delete removed attachments
  for (const e of existing) {
    if (!incomingUrls.has(e.url)) {
      try { await del(e.url) } catch { /* blob might already be gone */ }
      await prisma.attachment.delete({ where: { id: e.id } }).catch(() => {})
    }
  }

  // Create new attachments
  const existingUrls = new Set(existing.map((e) => e.url))
  const toCreate = incoming.filter((a) => !existingUrls.has(a.url) && !a.uploading)

  if (toCreate.length > 0) {
    await prisma.attachment.createMany({
      data: toCreate.map((a) => ({
        userId,
        entityType,
        entityId,
        filename: a.filename,
        url: a.url,
        size: a.size,
        mimeType: a.mimeType,
      })),
    })
  }
}

