'use server'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

// ─── 채널 ───────────────────────────────────────────────────────────────────

export async function getChannels() {
  const session = await verifySession()
  return prisma.channel.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function addChannel(channelId: string, channelName: string, thumbnailUrl: string) {
  const session = await verifySession()
  await prisma.channel.upsert({
    where: { userId_channelId: { userId: session.userId, channelId } },
    create: { userId: session.userId, channelId, channelName, thumbnailUrl },
    update: { channelName, thumbnailUrl, isActive: true },
  })
  revalidatePath('/materials')
}

export async function toggleChannel(id: number, isActive: boolean) {
  const session = await verifySession()
  const channel = await prisma.channel.findFirst({ where: { id, userId: session.userId } })
  if (!channel) return
  await prisma.channel.update({ where: { id }, data: { isActive } })
  revalidatePath('/materials')
}

export async function deleteChannel(id: number) {
  const session = await verifySession()
  await prisma.channel.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}

// ─── 수집 룰 ────────────────────────────────────────────────────────────────

export async function getCollectionRules() {
  const session = await verifySession()
  return prisma.collectionRule.findMany({
    where: { userId: session.userId },
    include: { channel: { select: { channelName: true, channelId: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function saveCollectionRules(
  channelDbIds: number[],
  minViews: number,
  maxDaysOld: number,
  minLikes: number,
  minComments: number,
  scheduleHour: number | null,
) {
  const session = await verifySession()

  // 선택된 채널이 모두 해당 유저의 채널인지 확인
  const ownedChannels = await prisma.channel.findMany({
    where: { id: { in: channelDbIds }, userId: session.userId },
    select: { id: true },
  })
  const validIds = ownedChannels.map((c) => c.id)

  await prisma.collectionRule.createMany({
    data: validIds.map((channelDbId) => ({
      channelDbId,
      userId: session.userId,
      minViews,
      maxDaysOld,
      minLikes,
      minComments,
      scheduleHour,
    })),
  })
  revalidatePath('/materials')
}

export async function deleteCollectionRule(id: number) {
  const session = await verifySession()
  await prisma.collectionRule.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}

// ─── 소재 ───────────────────────────────────────────────────────────────────

export async function getMaterials(filters?: {
  channelId?: string
  isUsed?: boolean | null
  dateFrom?: string
  dateTo?: string
}) {
  const session = await verifySession()

  return prisma.material.findMany({
    where: {
      userId: session.userId,
      ...(filters?.channelId ? { channelId: filters.channelId } : {}),
      ...(filters?.isUsed !== undefined && filters.isUsed !== null ? { isUsed: filters.isUsed } : {}),
      ...((filters?.dateFrom || filters?.dateTo) ? {
        collectedAt: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo + 'T23:59:59') } : {}),
        },
      } : {}),
    },
    orderBy: { collectedAt: 'desc' },
  })
}

export async function setMaterialUsed(id: number, isUsed: boolean) {
  const session = await verifySession()
  const mat = await prisma.material.findFirst({ where: { id, userId: session.userId } })
  if (!mat) return
  await prisma.material.update({
    where: { id },
    data: { isUsed, usedAt: isUsed ? new Date() : null },
  })
  revalidatePath('/materials')
}

export async function deleteMaterial(id: number) {
  const session = await verifySession()
  await prisma.material.deleteMany({ where: { id, userId: session.userId } })
  revalidatePath('/materials')
}
