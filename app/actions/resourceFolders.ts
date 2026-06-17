'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export type FolderNode = {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  children: FolderNode[]
  _count: number
}

export async function getResourceFolders(): Promise<FolderNode[]> {
  const session = await verifySession()
  const folders = await prisma.resourceFolder.findMany({
    where: { userId: session.userId },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { resources: true } } },
  })

  const map = new Map<number, FolderNode>()
  const roots: FolderNode[] = []

  for (const f of folders) {
    map.set(f.id, { id: f.id, name: f.name, parentId: f.parentId, sortOrder: f.sortOrder, children: [], _count: f._count.resources })
  }
  for (const f of folders) {
    const node = map.get(f.id)!
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export async function createResourceFolder(name: string, parentId?: number | null): Promise<{ success: boolean; id?: number; error?: string }> {
  const session = await verifySession()
  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: '폴더 이름을 입력하세요.' }

  const existing = await prisma.resourceFolder.findFirst({
    where: { userId: session.userId, name: trimmed, parentId: parentId ?? null },
  })
  if (existing) return { success: false, error: '같은 위치에 동일한 이름의 폴더가 있습니다.' }

  const count = await prisma.resourceFolder.count({ where: { userId: session.userId, parentId: parentId ?? null } })
  const folder = await prisma.resourceFolder.create({
    data: { userId: session.userId, name: trimmed, parentId: parentId ?? null, sortOrder: count },
  })
  revalidatePath('/resources')
  return { success: true, id: folder.id }
}

export async function updateResourceFolder(id: number, name: string): Promise<{ success: boolean; error?: string }> {
  const session = await verifySession()
  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: '폴더 이름을 입력하세요.' }

  const folder = await prisma.resourceFolder.findUnique({ where: { id } })
  if (!folder || folder.userId !== session.userId) return { success: false, error: '권한이 없습니다.' }

  const dup = await prisma.resourceFolder.findFirst({
    where: { userId: session.userId, name: trimmed, parentId: folder.parentId, NOT: { id } },
  })
  if (dup) return { success: false, error: '같은 위치에 동일한 이름의 폴더가 있습니다.' }

  await prisma.resourceFolder.update({ where: { id }, data: { name: trimmed } })
  revalidatePath('/resources')
  return { success: true }
}

export async function deleteResourceFolder(id: number): Promise<{ success: boolean; error?: string }> {
  const session = await verifySession()
  const folder = await prisma.resourceFolder.findUnique({
    where: { id },
    include: { _count: { select: { resources: true, children: true } } },
  })
  if (!folder || folder.userId !== session.userId) return { success: false, error: '권한이 없습니다.' }
  if (folder._count.children > 0) return { success: false, error: '하위 폴더가 있습니다. 먼저 하위 폴더를 삭제해주세요.' }

  // Move resources to unassigned
  await prisma.resourceLink.updateMany({ where: { folderId: id, userId: session.userId }, data: { folderId: null } })
  await prisma.resourceFolder.delete({ where: { id } })
  revalidatePath('/resources')
  return { success: true }
}

export async function moveResourcesToFolder(resourceIds: number[], folderId: number | null): Promise<{ success: boolean }> {
  const session = await verifySession()
  if (folderId !== null) {
    const folder = await prisma.resourceFolder.findUnique({ where: { id: folderId } })
    if (!folder || folder.userId !== session.userId) return { success: false }
  }
  await prisma.resourceLink.updateMany({
    where: { id: { in: resourceIds }, userId: session.userId },
    data: { folderId },
  })
  revalidatePath('/resources')
  return { success: true }
}
