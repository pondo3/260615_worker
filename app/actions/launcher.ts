'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function createGroup(formData: FormData) {
  const session = await verifySession()
  const name = (formData.get('name') as string)?.trim()
  if (!name) return
  const count = await prisma.launcherGroup.count({ where: { userId: session.userId } })
  await prisma.launcherGroup.create({
    data: {
      userId: session.userId,
      name,
      icon: (formData.get('icon') as string) || '🚀',
      color: (formData.get('color') as string) || '#6366F1',
      description: (formData.get('description') as string) || null,
      sortOrder: count,
    },
  })
  revalidatePath('/launcher')
}

export async function updateGroup(id: number, formData: FormData) {
  const session = await verifySession()
  const group = await prisma.launcherGroup.findUnique({ where: { id } })
  if (!group || group.userId !== session.userId) return
  const name = (formData.get('name') as string)?.trim()
  if (!name) return
  await prisma.launcherGroup.update({
    where: { id },
    data: {
      name,
      icon: (formData.get('icon') as string) || '🚀',
      color: (formData.get('color') as string) || '#6366F1',
      description: (formData.get('description') as string) || null,
    },
  })
  revalidatePath('/launcher')
}

export async function deleteGroup(id: number) {
  const session = await verifySession()
  const group = await prisma.launcherGroup.findUnique({ where: { id } })
  if (!group || group.userId !== session.userId) return
  await prisma.launcherGroup.delete({ where: { id } })
  revalidatePath('/launcher')
}

export async function toggleGroupPin(id: number) {
  const session = await verifySession()
  const group = await prisma.launcherGroup.findUnique({ where: { id } })
  if (!group || group.userId !== session.userId) return
  await prisma.launcherGroup.update({ where: { id }, data: { isPinned: !group.isPinned } })
  revalidatePath('/launcher')
}

export async function createLink(groupId: number, formData: FormData) {
  const session = await verifySession()
  const group = await prisma.launcherGroup.findUnique({ where: { id: groupId } })
  if (!group || group.userId !== session.userId) return
  const name = (formData.get('name') as string)?.trim()
  const url = (formData.get('url') as string)?.trim()
  if (!name || !url) return
  const count = await prisma.launcherLink.count({ where: { groupId } })
  await prisma.launcherLink.create({
    data: {
      groupId,
      name,
      url,
      description: (formData.get('description') as string) || null,
      openNewTab: formData.get('openNewTab') === 'true',
      isFavorite: formData.get('isFavorite') === 'true',
      sortOrder: count,
    },
  })
  revalidatePath('/launcher')
}

export async function updateLink(id: number, formData: FormData) {
  const session = await verifySession()
  const link = await prisma.launcherLink.findUnique({ where: { id }, include: { group: true } })
  if (!link || link.group.userId !== session.userId) return
  const name = (formData.get('name') as string)?.trim()
  const url = (formData.get('url') as string)?.trim()
  if (!name || !url) return
  await prisma.launcherLink.update({
    where: { id },
    data: {
      name,
      url,
      description: (formData.get('description') as string) || null,
      openNewTab: formData.get('openNewTab') === 'true',
      isFavorite: formData.get('isFavorite') === 'true',
      isActive: formData.get('isActive') !== 'false',
    },
  })
  revalidatePath('/launcher')
}

export async function deleteLink(id: number) {
  const session = await verifySession()
  const link = await prisma.launcherLink.findUnique({ where: { id }, include: { group: true } })
  if (!link || link.group.userId !== session.userId) return
  await prisma.launcherLink.delete({ where: { id } })
  revalidatePath('/launcher')
}

export async function toggleLinkActive(id: number) {
  const session = await verifySession()
  const link = await prisma.launcherLink.findUnique({ where: { id }, include: { group: true } })
  if (!link || link.group.userId !== session.userId) return
  await prisma.launcherLink.update({ where: { id }, data: { isActive: !link.isActive } })
  revalidatePath('/launcher')
}

export async function toggleLinkFavorite(id: number) {
  const session = await verifySession()
  const link = await prisma.launcherLink.findUnique({ where: { id }, include: { group: true } })
  if (!link || link.group.userId !== session.userId) return
  await prisma.launcherLink.update({ where: { id }, data: { isFavorite: !link.isFavorite } })
  revalidatePath('/launcher')
}

export async function recordLinkLaunch(ids: number[]) {
  if (ids.length === 0) return
  await prisma.launcherLink.updateMany({
    where: { id: { in: ids } },
    data: { launchCount: { increment: 1 }, lastLaunchedAt: new Date() },
  })
  revalidatePath('/launcher')
}

export async function createFolder(groupId: number, formData: FormData) {
  const session = await verifySession()
  const group = await prisma.launcherGroup.findUnique({ where: { id: groupId } })
  if (!group || group.userId !== session.userId) return
  const name = (formData.get('name') as string)?.trim()
  const path = (formData.get('path') as string)?.trim()
  if (!name || !path) return
  const count = await prisma.launcherFolder.count({ where: { groupId } })
  await prisma.launcherFolder.create({
    data: {
      groupId,
      name,
      path,
      description: (formData.get('description') as string) || null,
      sortOrder: count,
    },
  })
  revalidatePath('/launcher')
}

export async function updateFolder(id: number, formData: FormData) {
  const session = await verifySession()
  const folder = await prisma.launcherFolder.findUnique({ where: { id }, include: { group: true } })
  if (!folder || folder.group.userId !== session.userId) return
  const name = (formData.get('name') as string)?.trim()
  const path = (formData.get('path') as string)?.trim()
  if (!name || !path) return
  await prisma.launcherFolder.update({
    where: { id },
    data: {
      name,
      path,
      description: (formData.get('description') as string) || null,
      isActive: formData.get('isActive') !== 'false',
    },
  })
  revalidatePath('/launcher')
}

export async function deleteFolder(id: number) {
  const session = await verifySession()
  const folder = await prisma.launcherFolder.findUnique({ where: { id }, include: { group: true } })
  if (!folder || folder.group.userId !== session.userId) return
  await prisma.launcherFolder.delete({ where: { id } })
  revalidatePath('/launcher')
}

export async function toggleFolderActive(id: number) {
  const session = await verifySession()
  const folder = await prisma.launcherFolder.findUnique({ where: { id }, include: { group: true } })
  if (!folder || folder.group.userId !== session.userId) return
  await prisma.launcherFolder.update({ where: { id }, data: { isActive: !folder.isActive } })
  revalidatePath('/launcher')
}
