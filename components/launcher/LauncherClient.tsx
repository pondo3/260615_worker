'use client'

import { useState, useTransition } from 'react'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  toggleGroupPin,
  createLink,
  updateLink,
  deleteLink,
  toggleLinkActive,
  toggleLinkFavorite,
  recordLinkLaunch,
  createFolder,
  updateFolder,
  deleteFolder,
  toggleFolderActive,
} from '@/app/actions/launcher'

// ── 타입 정의 ──────────────────────────────────────────────────
type LauncherLink = {
  id: number
  name: string
  url: string
  description: string | null
  isActive: boolean
  openNewTab: boolean
  isFavorite: boolean
  launchCount: number
  lastLaunchedAt: string | null
  sortOrder: number
}

type LauncherFolder = {
  id: number
  name: string
  path: string
  description: string | null
  isActive: boolean
  sortOrder: number
}

type LauncherGroup = {
  id: number
  name: string
  icon: string
  color: string
  description: string | null
  isPinned: boolean
  sortOrder: number
  links: LauncherLink[]
  folders: LauncherFolder[]
}

// ── 파비콘 헬퍼 ────────────────────────────────────────────────
function getFavicon(url: string): string {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch {
    return ''
  }
}

// ── 날짜 포맷 헬퍼 ─────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ── GroupModal ─────────────────────────────────────────────────
function GroupModal({
  group,
  onClose,
}: {
  group?: LauncherGroup
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (group) {
        await updateGroup(group.id, fd)
      } else {
        await createGroup(fd)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {group ? '그룹 수정' : '그룹 추가'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
              <input
                name="name"
                defaultValue={group?.name ?? ''}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이콘</label>
                <input
                  name="icon"
                  defaultValue={group?.icon ?? '🚀'}
                  maxLength={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">색상</label>
                <input
                  type="color"
                  name="color"
                  defaultValue={group?.color ?? '#6366F1'}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                name="description"
                defaultValue={group?.description ?? ''}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {pending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── LinkModal ──────────────────────────────────────────────────
function LinkModal({
  groupId,
  link,
  onClose,
}: {
  groupId: number
  link?: LauncherLink
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (link) {
        await updateLink(link.id, fd)
      } else {
        await createLink(groupId, fd)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {link ? '링크 수정' : '링크 추가'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
              <input
                name="name"
                defaultValue={link?.name ?? ''}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL *</label>
              <input
                name="url"
                type="url"
                defaultValue={link?.url ?? ''}
                required
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                name="description"
                defaultValue={link?.description ?? ''}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="openNewTab"
                  value="true"
                  defaultChecked={link?.openNewTab ?? true}
                  className="rounded"
                />
                새 탭에서 열기
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFavorite"
                  value="true"
                  defaultChecked={link?.isFavorite ?? false}
                  className="rounded"
                />
                즐겨찾기
              </label>
              {link && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={link.isActive}
                    className="rounded"
                  />
                  활성
                </label>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {pending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── FolderModal ────────────────────────────────────────────────
function FolderModal({
  groupId,
  folder,
  onClose,
}: {
  groupId: number
  folder?: LauncherFolder
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (folder) {
        await updateFolder(folder.id, fd)
      } else {
        await createFolder(groupId, fd)
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {folder ? '폴더 수정' : '폴더 추가'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
              <input
                name="name"
                defaultValue={folder?.name ?? ''}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">경로 *</label>
              <input
                name="path"
                defaultValue={folder?.path ?? ''}
                required
                placeholder="C:\Users\..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">설명</label>
              <textarea
                name="description"
                defaultValue={folder?.description ?? ''}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
            {folder && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={folder.isActive}
                  className="rounded"
                />
                활성
              </label>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {pending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function LauncherClient({ groups }: { groups: LauncherGroup[] }) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    groups.length > 0 ? groups[0].id : null
  )
  const [groupModal, setGroupModal] = useState<{ open: boolean; group?: LauncherGroup }>({ open: false })
  const [linkModal, setLinkModal] = useState<{ open: boolean; link?: LauncherLink }>({ open: false })
  const [folderModal, setFolderModal] = useState<{ open: boolean; folder?: LauncherFolder }>({ open: false })
  const [copiedFolderId, setCopiedFolderId] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()
  const [faviconErrors, setFaviconErrors] = useState<Set<number>>(new Set())

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null
  const activeLinks = selectedGroup?.links.filter((l) => l.isActive) ?? []

  function openLinks(links: LauncherLink[]) {
    if (links.length === 0) return
    if (links.length >= 5) {
      const ok = window.confirm(
        `${links.length}개의 링크를 한꺼번에 열려고 합니다.\n브라우저 팝업 차단 설정을 확인하세요. 계속하시겠습니까?`
      )
      if (!ok) return
    }
    const ids: number[] = []
    links.forEach((link, i) => {
      setTimeout(() => {
        window.open(link.url, link.openNewTab ? '_blank' : '_self')
      }, i * 150)
      ids.push(link.id)
    })
    startTransition(async () => {
      await recordLinkLaunch(ids)
    })
  }

  function handleLinkClick(link: LauncherLink) {
    window.open(link.url, link.openNewTab ? '_blank' : '_self')
    startTransition(async () => {
      await recordLinkLaunch([link.id])
    })
  }

  function handleTogglePin(groupId: number) {
    startTransition(async () => {
      await toggleGroupPin(groupId)
    })
  }

  function handleDeleteGroup(groupId: number) {
    if (!window.confirm('이 그룹을 삭제하시겠습니까? 포함된 링크와 폴더도 모두 삭제됩니다.')) return
    startTransition(async () => {
      await deleteGroup(groupId)
      setSelectedGroupId(groups.find((g) => g.id !== groupId)?.id ?? null)
    })
  }

  function handleToggleLinkActive(id: number) {
    startTransition(async () => {
      await toggleLinkActive(id)
    })
  }

  function handleToggleLinkFavorite(id: number) {
    startTransition(async () => {
      await toggleLinkFavorite(id)
    })
  }

  function handleDeleteLink(id: number) {
    if (!window.confirm('이 링크를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteLink(id)
    })
  }

  function handleToggleFolderActive(id: number) {
    startTransition(async () => {
      await toggleFolderActive(id)
    })
  }

  function handleDeleteFolder(id: number) {
    if (!window.confirm('이 폴더를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteFolder(id)
    })
  }

  async function handleCopyPath(folder: LauncherFolder) {
    try {
      await navigator.clipboard.writeText(folder.path)
      setCopiedFolderId(folder.id)
      setTimeout(() => setCopiedFolderId(null), 2000)
    } catch {
      // clipboard API 실패 시 무시
    }
  }

  const favActiveLinks = selectedGroup?.links.filter((l) => l.isFavorite && l.isActive) ?? []

  return (
    <div>
      {/* ── 헤더 배너 ── */}
      <div className="bg-violet-950 rounded-2xl mb-6 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">업무 런처</h1>
          <p className="text-violet-300 text-sm">업무별 사이트와 폴더를 한번에 실행하세요</p>
        </div>
        <button
          onClick={() => setGroupModal({ open: true })}
          disabled={pending}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          + 그룹 추가
        </button>
      </div>

      {/* ── 그룹 없음 ── */}
      {groups.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">그룹이 없습니다</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">위의 &quot;+ 그룹 추가&quot; 버튼으로 업무 그룹을 만들어보세요</p>
        </div>
      ) : (
        <>
          {/* ── 그룹 탭 ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {groups.map((g) => {
                const isSelected = g.id === selectedGroupId
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                      isSelected
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={isSelected ? { borderColor: g.color } : undefined}
                  >
                    <span>{g.icon}</span>
                    <span>{g.name}</span>
                    {g.isPinned && <span className="text-xs">📌</span>}
                  </button>
                )
              })}
            </div>
            {/* 선택된 그룹 제어 버튼 */}
            {selectedGroup && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setGroupModal({ open: true, group: selectedGroup })}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  그룹 편집
                </button>
                <button
                  onClick={() => handleTogglePin(selectedGroup.id)}
                  disabled={pending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                    selectedGroup.isPinned
                      ? 'border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {selectedGroup.isPinned ? '📌 고정됨' : '핀 고정'}
                </button>
                <button
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  그룹 삭제
                </button>
              </div>
            )}
          </div>

          {/* ── 링크 섹션 ── */}
          {selectedGroup && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-4">
              {/* 섹션 헤더 */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  🔗 링크
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  ({selectedGroup.links.length}개)
                </span>
                <div className="flex-1" />
                {activeLinks.length > 0 && (
                  <>
                    <button
                      onClick={() => openLinks(activeLinks)}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                    >
                      전체 열기 ({activeLinks.length}개)
                    </button>
                    {favActiveLinks.length > 0 && (
                      <button
                        onClick={() => openLinks(favActiveLinks)}
                        disabled={pending}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                      >
                        즐겨찾기만 열기 ({favActiveLinks.length}개)
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => setLinkModal({ open: true })}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
                >
                  + 링크 추가
                </button>
              </div>

              {/* 팝업 차단 경고 */}
              {activeLinks.length >= 5 && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span>⚠️</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    팝업 차단 주의: 브라우저 설정에서 이 사이트의 팝업을 허용해야 합니다.
                  </p>
                </div>
              )}

              {/* 링크 목록 */}
              {selectedGroup.links.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">링크를 추가하세요</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedGroup.links.map((link) => {
                    const faviconUrl = getFavicon(link.url)
                    const hasFaviconError = faviconErrors.has(link.id)
                    return (
                      <div
                        key={link.id}
                        className={`bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2 transition-opacity ${
                          !link.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        {/* 상단 */}
                        <div className="flex items-start gap-3">
                          {/* 파비콘 */}
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                            {faviconUrl && !hasFaviconError ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={faviconUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="rounded"
                                onError={() => setFaviconErrors((prev) => new Set(prev).add(link.id))}
                              />
                            ) : (
                              <span className="text-2xl">🌐</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => handleLinkClick(link)}
                              className="block w-full text-left text-sm font-bold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate"
                            >
                              {link.name}
                            </button>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{link.url}</p>
                          </div>
                          {/* 즐겨찾기 버튼 */}
                          <button
                            onClick={() => handleToggleLinkFavorite(link.id)}
                            disabled={pending}
                            className="flex-shrink-0 text-lg leading-none disabled:opacity-50"
                            title={link.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          >
                            {link.isFavorite ? '⭐' : '☆'}
                          </button>
                        </div>

                        {/* 설명 */}
                        {link.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{link.description}</p>
                        )}

                        {/* 메타 정보 */}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                          <span>실행 {link.launchCount}회</span>
                          {link.lastLaunchedAt && (
                            <span>· 마지막: {formatDate(link.lastLaunchedAt)}</span>
                          )}
                          {!link.isActive && (
                            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-semibold">
                              비활성
                            </span>
                          )}
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex items-center gap-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                          {/* 활성 토글 */}
                          <button
                            onClick={() => handleToggleLinkActive(link.id)}
                            disabled={pending}
                            className={`text-[11px] px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                              link.isActive
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100'
                                : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {link.isActive ? '활성' : '비활성'}
                          </button>
                          <div className="flex-1" />
                          {/* 수정 */}
                          <button
                            onClick={() => setLinkModal({ open: true, link })}
                            disabled={pending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {/* 삭제 */}
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={pending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 폴더 섹션 ── */}
          {selectedGroup && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  📁 등록 폴더
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  ({selectedGroup.folders.length}개)
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => setFolderModal({ open: true })}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
                >
                  + 폴더 추가
                </button>
              </div>

              {/* 웹 보안 안내 */}
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span>💡</span>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  웹 보안 정책으로 폴더를 직접 열 수 없습니다. 경로를 복사해 탐색기 주소창에 붙여넣으세요.
                </p>
              </div>

              {/* 폴더 목록 */}
              {selectedGroup.folders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">폴더를 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedGroup.folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-opacity ${
                        !folder.isActive ? 'opacity-50' : ''
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">📁</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{folder.name}</span>
                          {folder.description && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{folder.description}</span>
                          )}
                          {!folder.isActive && (
                            <span className="px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-semibold">
                              비활성
                            </span>
                          )}
                        </div>
                        <code className="inline-block mt-1 text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 max-w-full truncate">
                          {folder.path}
                        </code>
                      </div>
                      {/* 경로 복사 */}
                      <button
                        onClick={() => handleCopyPath(folder)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {copiedFolderId === folder.id ? '복사됨!' : '경로 복사'}
                      </button>
                      {/* 활성 토글 */}
                      <button
                        onClick={() => handleToggleFolderActive(folder.id)}
                        disabled={pending}
                        className={`flex-shrink-0 text-[11px] px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          folder.isActive
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100'
                            : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {folder.isActive ? '활성' : '비활성'}
                      </button>
                      {/* 수정 */}
                      <button
                        onClick={() => setFolderModal({ open: true, folder })}
                        disabled={pending}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      {/* 삭제 */}
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        disabled={pending}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── 모달 ── */}
      {groupModal.open && (
        <GroupModal
          group={groupModal.group}
          onClose={() => setGroupModal({ open: false })}
        />
      )}
      {linkModal.open && selectedGroup && (
        <LinkModal
          groupId={selectedGroup.id}
          link={linkModal.link}
          onClose={() => setLinkModal({ open: false })}
        />
      )}
      {folderModal.open && selectedGroup && (
        <FolderModal
          groupId={selectedGroup.id}
          folder={folderModal.folder}
          onClose={() => setFolderModal({ open: false })}
        />
      )}
    </div>
  )
}
