'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteResource, toggleFavorite } from '@/app/actions/resources'
import { refreshYoutubeData } from '@/app/actions/youtube'
import { createResourceFolder, updateResourceFolder, deleteResourceFolder, type FolderNode } from '@/app/actions/resourceFolders'
import ResourceModal, { ResourceItem } from './ResourceModal'
import CategoryManager from './CategoryManager'
import PageHeader from '@/components/ui/PageHeader'

type Resource = {
  id: number
  title: string
  url: string
  memo: string | null
  platform: string | null
  customPlatform: string | null
  resourceType: string | null
  customResourceType: string | null
  status: string
  priority: string
  isFavorite: boolean
  tags: string[]
  thumbnailUrl: string | null
  thumbnailSource: string | null
  ytVideoId: string | null
  ytOriginalTitle: string | null
  ytChannelName: string | null
  ytChannelId: string | null
  ytPublishedAt: string | null
  ytDescription: string | null
  ytDuration: string | null
  ytViewCount: string | null
  ytLikeCount: string | null
  ytCommentCount: string | null
  ytPrivacyStatus: string | null
  ytApiLastFetched: string | null
  ytApiFetchSuccess: boolean | null
  ytApiError: string | null
  registeredAt: string
  sourcePublishedAt: string | null
  categoryId: number | null
  categoryName: string | null
  categoryColor: string | null
  projectId: number | null
  testId: number | null
  folderId: number | null
  folderName: string | null
  relatedLinks: { id: number; title: string; url: string; memo: string | null }[]
}

type Category = { id: number; name: string; color: string; description: string | null; sortOrder: number; _count: { resources: number } }

type Props = {
  resources: Resource[]
  categories: Category[]
  projects: { id: number; title: string }[]
  tests: { id: number; title: string }[]
  folders: FolderNode[]
}

const STATUS_BADGE: Record<string, string> = {
  '확인 전': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  '보는 중': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  '완료':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  '보류':    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  '폐기':    'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const PRIORITY_BADGE: Record<string, string> = {
  '낮음':     'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  '보통':     'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  '높음':     'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  '매우 중요': 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const PRIORITY_ORDER: Record<string, number> = { '매우 중요': 0, '높음': 1, '보통': 2, '낮음': 3 }
const STATUS_ORDER: Record<string, number> = { '보는 중': 0, '확인 전': 1, '보류': 2, '완료': 3, '폐기': 4 }

function getTypeIcon(platform: string | null, resourceType: string | null): string {
  if (platform === 'YouTube') return '▶'
  if (platform === 'GitHub') return '⌥'
  if (platform === 'Figma') return 'F'
  if (platform === 'Notion') return '◻'
  if (platform === 'Google Drive') return '△'
  if (platform === 'Instagram') return '📷'
  if (platform === 'TikTok') return '🎵'
  if (resourceType === '영상') return '🎬'
  if (resourceType === '강의') return '🎓'
  if (resourceType === '글') return '📄'
  if (resourceType === '이미지') return '🖼️'
  if (resourceType === '디자인') return '🎨'
  if (resourceType === '코드') return '💻'
  if (resourceType === '문서') return '📋'
  if (resourceType === '폴더') return '📁'
  if (resourceType === '도구') return '🔧'
  return '🔗'
}

function parseDuration(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return iso
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const sec = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${min}:${String(sec).padStart(2, '0')}`
}

function formatCount(n: string | null | undefined): string {
  if (!n) return ''
  const num = Number(n)
  if (isNaN(num)) return n
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`
  if (num >= 10000) return `${Math.floor(num / 10000).toLocaleString()}만`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (/(?:www\.|m\.)?youtube\.com/.test(u.hostname)) {
      const v = u.searchParams.get('v')
      if (v) return v
      const shorts = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
      if (shorts) return shorts[1]
      const embed = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/)
      if (embed) return embed[1]
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      if (id) return id
    }
  } catch {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return m?.[1] ?? null
  }
  return null
}

function ThumbnailBox({ r, size }: { r: Resource; size: 'sm' | 'lg' }) {
  const [imgError, setImgError] = useState(false)
  const cls = size === 'sm'
    ? 'w-14 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center'
    : 'w-full h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3'

  // URL에서 직접 YouTube ID를 추출하여 항상 최신 CDN URL 사용 (DB의 오래된 URL 무시)
  const ytId = extractYoutubeId(r.url)
  const effectiveThumbnailUrl = ytId
    ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
    : r.thumbnailUrl

  const showImg = !imgError && !!effectiveThumbnailUrl

  if (showImg) {
    return (
      <div className={cls}>
        <img
          src={effectiveThumbnailUrl!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div className={cls}>
      <span className={size === 'sm' ? 'text-xl' : 'text-4xl'}>{getTypeIcon(r.platform, r.resourceType)}</span>
    </div>
  )
}

type SortKey = 'newest' | 'oldest' | 'priority' | 'category' | 'status'
type SelectedFolder = 'all' | 'favorites' | 'recent' | 'unassigned' | number

type FolderTreeItemProps = {
  node: FolderNode
  depth: number
  selected: SelectedFolder
  onSelect: (id: number) => void
  onCreateChild: (parentId: number) => void
  onStartRename: (id: number, name: string) => void
  onDelete: (id: number, name: string) => void
}

function FolderTreeItem({ node, depth, selected, onSelect, onCreateChild, onStartRename, onDelete }: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selected === node.id
  return (
    <div>
      <div
        className={`group flex items-center gap-0.5 pr-1 py-1 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          onClick={() => node.children.length > 0 && setExpanded(!expanded)}
          className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[10px] text-gray-400"
        >
          {node.children.length > 0 ? (expanded ? '▾' : '▸') : '·'}
        </button>
        <button onClick={() => onSelect(node.id)} className="flex-1 text-left text-xs font-medium flex items-center gap-1 min-w-0">
          <span className="flex-shrink-0 text-[11px]">📁</span>
          <span className="truncate">{node.name}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">({node._count})</span>
        </button>
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => { onCreateChild(node.id) }} title="하위 폴더 만들기"
            className="p-0.5 rounded hover:text-teal-600 dark:hover:text-teal-400 text-gray-300">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={() => onStartRename(node.id, node.name)} title="이름 변경"
            className="p-0.5 rounded hover:text-blue-600 dark:hover:text-blue-400 text-gray-300">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => onDelete(node.id, node.name)} title="삭제"
            className="p-0.5 rounded hover:text-red-500 dark:hover:text-red-400 text-gray-300">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      {expanded && node.children.map((child) => (
        <FolderTreeItem key={child.id} node={child} depth={depth + 1} selected={selected}
          onSelect={onSelect} onCreateChild={onCreateChild} onStartRename={onStartRename} onDelete={onDelete} />
      ))}
    </div>
  )
}

export default function ResourceListClient({ resources, categories, projects, tests, folders }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [showModal, setShowModal] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [editResource, setEditResource] = useState<ResourceItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | null>(null)  // null = 전체
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<'table' | 'card'>('table')
  useEffect(() => {
    const s = localStorage.getItem('view_resources')
    if (s === 'card' || s === 'table') setView(s)
  }, [])
  const changeView = (v: 'table' | 'card') => { setView(v); localStorage.setItem('view_resources', v) }
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Folder state
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>('all')
  const [folderDialog, setFolderDialog] = useState<{ mode: 'create'; parentId: number | null } | { mode: 'rename'; folderId: number; currentName: string } | null>(null)
  const [folderDialogName, setFolderDialogName] = useState('')
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<{ id: number; name: string } | null>(null)

  async function handleFolderSubmit() {
    if (!folderDialog) return
    if (folderDialog.mode === 'create') {
      const res = await createResourceFolder(folderDialogName, folderDialog.parentId)
      if (res.success) { setFolderDialog(null); setFolderDialogName(''); router.refresh() }
      else alert(res.error)
    } else {
      const res = await updateResourceFolder(folderDialog.folderId, folderDialogName)
      if (res.success) { setFolderDialog(null); setFolderDialogName(''); router.refresh() }
      else alert(res.error)
    }
  }

  async function handleFolderDelete() {
    if (!folderDeleteTarget) return
    const res = await deleteResourceFolder(folderDeleteTarget.id)
    if (res.success) {
      if (selectedFolder === folderDeleteTarget.id) setSelectedFolder('all')
      setFolderDeleteTarget(null); router.refresh()
    } else {
      alert(res.error)
    }
  }

  // 통계
  const total = resources.length
  const done = resources.filter((r) => r.status === '완료').length
  const unchecked = resources.filter((r) => r.status === '확인 전').length
  const onhold = resources.filter((r) => r.status === '보류').length
  const favorites = resources.filter((r) => r.isFavorite).length

  // 필터 옵션
  const allPlatforms = Array.from(new Set(resources.map((r) => r.platform).filter(Boolean))) as string[]
  const allTypes = Array.from(new Set(resources.map((r) => r.resourceType).filter(Boolean))) as string[]

  // 카테고리별 자료 수
  const catCount: Record<number, number> = {}
  resources.forEach((r) => { if (r.categoryId) catCount[r.categoryId] = (catCount[r.categoryId] ?? 0) + 1 })

  // 필터링
  const filtered = resources
    .filter((r) => {
      const q = search.toLowerCase()
      const effectivePlatform = r.platform === '기타' ? (r.customPlatform ?? '기타') : (r.platform ?? '')
      const effectiveType = r.resourceType === '기타' ? (r.customResourceType ?? '기타') : (r.resourceType ?? '')
      const matchSearch = !q || [r.title, r.url, r.memo, r.categoryName, r.platform, r.resourceType, ...r.tags]
        .some((v) => v?.toLowerCase().includes(q))
      const matchCat = activeCategory === null || r.categoryId === activeCategory
      const matchPlat = !filterPlatform || effectivePlatform === filterPlatform
      const matchType = !filterType || effectiveType === filterType
      const matchStatus = !filterStatus || r.status === filterStatus
      const matchPriority = !filterPriority || r.priority === filterPriority
      let matchFolder = true
      if (selectedFolder === 'favorites') matchFolder = r.isFavorite
      else if (selectedFolder === 'recent') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
        matchFolder = r.registeredAt >= sevenDaysAgo
      } else if (selectedFolder === 'unassigned') matchFolder = r.folderId === null
      else if (typeof selectedFolder === 'number') matchFolder = r.folderId === selectedFolder
      return matchSearch && matchCat && matchPlat && matchType && matchStatus && matchPriority && matchFolder
    })
    .sort((a, b) => {
      if (sortKey === 'newest') return b.registeredAt.localeCompare(a.registeredAt)
      if (sortKey === 'oldest') return a.registeredAt.localeCompare(b.registeredAt)
      if (sortKey === 'priority') return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      if (sortKey === 'category') return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'ko')
      if (sortKey === 'status') return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return 0
    })

  function openAdd() { setEditResource(null); setShowModal(true) }
  function openEdit(r: Resource) {
    setEditResource({
      id: r.id, title: r.title, url: r.url, memo: r.memo,
      platform: r.platform, customPlatform: r.customPlatform,
      resourceType: r.resourceType, customResourceType: r.customResourceType,
      status: r.status, priority: r.priority, isFavorite: r.isFavorite,
      tags: r.tags, thumbnailUrl: r.thumbnailUrl, thumbnailSource: r.thumbnailSource,
      ytVideoId: r.ytVideoId, ytOriginalTitle: r.ytOriginalTitle,
      ytChannelName: r.ytChannelName, ytChannelId: r.ytChannelId,
      ytPublishedAt: r.ytPublishedAt, ytDescription: r.ytDescription,
      ytDuration: r.ytDuration, ytViewCount: r.ytViewCount,
      ytLikeCount: r.ytLikeCount, ytCommentCount: r.ytCommentCount,
      ytPrivacyStatus: r.ytPrivacyStatus, ytApiLastFetched: r.ytApiLastFetched,
      ytApiFetchSuccess: r.ytApiFetchSuccess, ytApiError: r.ytApiError,
      registeredAt: r.registeredAt, sourcePublishedAt: r.sourcePublishedAt,
      categoryId: r.categoryId, projectId: r.projectId, testId: r.testId,
      folderId: r.folderId,
      relatedLinks: r.relatedLinks,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditResource(null); router.refresh() }

  function handleDelete(id: number) {
    setDeleteId(null)
    startTransition(async () => { await deleteResource(id); router.refresh() })
  }
  function handleToggleFavorite(r: Resource) {
    startTransition(async () => { await toggleFavorite(r.id, r.isFavorite); router.refresh() })
  }
  function handleRefreshYoutube(id: number) {
    startTransition(async () => { await refreshYoutubeData(id); router.refresh() })
  }
  function copyLink(r: Resource) {
    navigator.clipboard.writeText(r.url).then(() => {
      setCopiedId(r.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'))
  const modalCats = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 pb-4">
      <PageHeader
        title="자료 보관함"
        description="유튜브, 강의, 디자인, 개발 자료 등 참고 링크를 카테고리별로 저장하고 관리합니다"
        accent="teal"
        stats={[
          { label: '전체', value: total },
          { label: '완료', value: done },
          { label: '확인 전', value: unchecked },
          { label: '보류', value: onhold },
          { label: '즐겨찾기', value: favorites },
        ]}
        actions={
          <>
            <button
              onClick={() => setShowCatManager(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold rounded-xl transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              카테고리 관리
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              자료 등록
            </button>
          </>
        }
      />

      {/* ── 카테고리 탭 ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeCategory === null
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          전체
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === null ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
            {total}
          </span>
        </button>
        {sortedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === cat.id ? 'text-white' : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            {cat.name}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
              {catCount[cat.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex">
        {/* ── 좌측 폴더 트리 ── */}
        <div className="w-52 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl mr-4 self-start">
          <div className="p-3 space-y-0.5">
            {([
              { key: 'all' as const, label: '전체 자료', icon: '◎', count: resources.length },
              { key: 'favorites' as const, label: '즐겨찾기', icon: '★', count: resources.filter((r) => r.isFavorite).length },
              { key: 'recent' as const, label: '최근 7일', icon: '🕐', count: resources.filter((r) => r.registeredAt >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).length },
              { key: 'unassigned' as const, label: '미분류', icon: '📂', count: resources.filter((r) => !r.folderId).length },
            ]).map((item) => (
              <button key={item.key} onClick={() => setSelectedFolder(item.key)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedFolder === item.key ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-[10px] text-gray-400">{item.count}</span>
              </button>
            ))}

            <div className="flex items-center justify-between px-2 pt-3 pb-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">폴더</span>
              <button onClick={() => { setFolderDialog({ mode: 'create', parentId: null }); setFolderDialogName('') }}
                className="p-0.5 rounded hover:text-teal-600 dark:hover:text-teal-400 text-gray-400" title="루트 폴더 만들기">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            {folders.length === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-2 py-1">폴더를 만들어 자료를 정리하세요</p>
            )}
            {folders.map((node) => (
              <FolderTreeItem key={node.id} node={node} depth={0} selected={selectedFolder}
                onSelect={(id) => setSelectedFolder(id)}
                onCreateChild={(parentId) => { setFolderDialog({ mode: 'create', parentId }); setFolderDialogName('') }}
                onStartRename={(id, name) => { setFolderDialog({ mode: 'rename', folderId: id, currentName: name }); setFolderDialogName(name) }}
                onDelete={(id, name) => setFolderDeleteTarget({ id, name })}
              />
            ))}
          </div>
        </div>

        {/* ── 우측 콘텐츠 ── */}
        <div className="flex-1 space-y-3">
        {/* 검색 + 정렬 + 뷰 토글 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 링크, 메모, 태그 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
            />
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-600 dark:text-gray-400 outline-none focus:border-teal-400">
            <option value="newest">최신 등록순</option>
            <option value="oldest">오래된 등록순</option>
            <option value="priority">중요도 높은순</option>
            <option value="category">카테고리순</option>
            <option value="status">상태순</option>
          </select>
          <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {(['card', 'table'] as const).map((v) => (
              <button key={v} onClick={() => changeView(v)}
                className={`px-3 py-2.5 transition-colors ${view === v ? 'bg-teal-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {v === 'card' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: '전체 플랫폼', value: filterPlatform, setter: setFilterPlatform, options: allPlatforms },
            { label: '전체 유형', value: filterType, setter: setFilterType, options: allTypes },
            { label: '전체 상태', value: filterStatus, setter: setFilterStatus, options: ['확인 전', '보는 중', '완료', '보류', '폐기'] },
            { label: '전체 중요도', value: filterPriority, setter: setFilterPriority, options: ['낮음', '보통', '높음', '매우 중요'] },
          ].map((f) => (
            <select key={f.label} value={f.value} onChange={(e) => f.setter(e.target.value)}
              className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 outline-none focus:border-teal-400">
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {(search || filterPlatform || filterType || filterStatus || filterPriority) && (
            <button
              onClick={() => { setSearch(''); setFilterPlatform(''); setFilterType(''); setFilterStatus(''); setFilterPriority('') }}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline px-1"
            >
              필터 초기화
            </button>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{filtered.length}개</span>
        </div>

        {/* ── 카드 뷰 ── */}
        {view === 'card' && (
          <div>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                {resources.length === 0 ? '자료를 등록해보세요.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-teal-300 dark:hover:border-teal-700 transition-colors group">
                    {/* 썸네일 영역 */}
                    <div className="relative">
                      <ThumbnailBox r={r} size="lg" />
                      {/* 카테고리 배지 */}
                      {r.categoryName && (
                        <div className="absolute top-2 left-2">
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                            style={{ backgroundColor: r.categoryColor ?? '#6B7280' }}
                          >
                            {r.categoryName}
                          </span>
                        </div>
                      )}
                      {/* 즐겨찾기 */}
                      <button
                        onClick={() => handleToggleFavorite(r)}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
                          r.isFavorite ? 'bg-amber-500/90 text-white' : 'bg-white/70 dark:bg-gray-900/70 text-gray-400 hover:text-amber-400'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill={r.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>

                    <div className="p-3">
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="font-bold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-sm line-clamp-2 leading-snug block mb-1">
                        {r.title}
                      </a>

                      {/* YouTube 채널 + 통계 */}
                      {(r.ytChannelName || r.ytViewCount || r.ytDuration) && (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-1.5">
                          {r.ytChannelName && (
                            <span className="text-[10px] text-red-500 dark:text-red-400 font-medium truncate max-w-[120px]">
                              {r.ytChannelName}
                            </span>
                          )}
                          {r.ytViewCount && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              조회 {formatCount(r.ytViewCount)}
                            </span>
                          )}
                          {r.ytDuration && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {parseDuration(r.ytDuration)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[r.status] ?? ''}`}>{r.status}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_BADGE[r.priority] ?? ''}`}>{r.priority}</span>
                        {(r.platform === '기타' ? r.customPlatform : r.platform) && (
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] rounded">
                            {r.platform === '기타' ? r.customPlatform : r.platform}
                          </span>
                        )}
                        {(r.resourceType === '기타' ? r.customResourceType : r.resourceType) && (
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] rounded">
                            {r.resourceType === '기타' ? r.customResourceType : r.resourceType}
                          </span>
                        )}
                      </div>

                      {r.memo && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{r.memo}</p>}

                      {r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {r.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-[10px] rounded font-medium">
                              #{tag}
                            </span>
                          ))}
                          {r.tags.length > 4 && <span className="text-[10px] text-gray-400">+{r.tags.length - 4}</span>}
                        </div>
                      )}

                      {r.relatedLinks.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {r.relatedLinks.map((link) => (
                            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[10px] bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors">
                              <svg className="w-2.5 h-2.5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span className="flex-1 truncate text-gray-600 dark:text-gray-300 font-medium">{link.title}</span>
                              {link.memo && <span className="truncate max-w-[70px] text-gray-400 dark:text-gray-500">{link.memo}</span>}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{r.registeredAt}</span>
                        <div className="flex items-center gap-0.5">
                          {r.ytVideoId && (
                            <button onClick={() => handleRefreshYoutube(r.id)} title="YouTube 정보 새로고침"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                          )}
                          <button onClick={() => copyLink(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                            {copiedId === r.id
                              ? <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            }
                          </button>
                          <a href={r.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                          <button onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(r.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 테이블 뷰 ── */}
        {view === 'table' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                {resources.length === 0 ? '자료를 등록해보세요.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['', '제목', '카테고리', '플랫폼', '유형', '중요도', '상태', '등록일', ''].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                        {/* 썸네일 */}
                        <td className="pl-3 py-2 w-16">
                          <ThumbnailBox r={r} size="sm" />
                        </td>
                        {/* 제목 */}
                        <td className="px-3 py-2 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 truncate block max-w-[180px]"
                              title={r.title}>
                              {r.title}
                            </a>
                            {r.isFavorite && (
                              <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </div>
                          {r.ytChannelName && (
                            <p className="text-[10px] text-red-500 dark:text-red-400 truncate mt-0.5 max-w-[180px]">{r.ytChannelName}</p>
                          )}
                          {!r.ytChannelName && r.memo && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 max-w-[180px]">{r.memo}</p>}
                          {(r.ytViewCount || r.ytDuration) && (
                            <div className="flex gap-1.5 mt-0.5">
                              {r.ytViewCount && <span className="text-[9px] text-gray-400">조회 {formatCount(r.ytViewCount)}</span>}
                              {r.ytDuration && <span className="text-[9px] text-gray-400">{parseDuration(r.ytDuration)}</span>}
                            </div>
                          )}
                          {r.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {r.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[9px] px-1 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded">#{t}</span>
                              ))}
                            </div>
                          )}
                          {r.relatedLinks.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {r.relatedLinks.slice(0, 2).map((link) => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                                  className="text-[9px] px-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:underline truncate max-w-[90px]">
                                  🔗 {link.title}
                                </a>
                              ))}
                              {r.relatedLinks.length > 2 && <span className="text-[9px] text-gray-400">+{r.relatedLinks.length - 2}</span>}
                            </div>
                          )}
                        </td>
                        {/* 카테고리 */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.categoryName ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold text-white"
                              style={{ backgroundColor: r.categoryColor ?? '#6B7280' }}>
                              {r.categoryName}
                            </span>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        {/* 플랫폼 */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {r.platform === '기타' ? (r.customPlatform ?? '기타') : (r.platform ?? '—')}
                        </td>
                        {/* 유형 */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {r.resourceType === '기타' ? (r.customResourceType ?? '기타') : (r.resourceType ?? '—')}
                        </td>
                        {/* 중요도 */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${PRIORITY_BADGE[r.priority] ?? ''}`}>
                            {r.priority}
                          </span>
                        </td>
                        {/* 상태 */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_BADGE[r.status] ?? ''}`}>
                            {r.status}
                          </span>
                        </td>
                        {/* 등록일 */}
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                          {r.registeredAt}
                          {r.sourcePublishedAt && (
                            <div className="text-[10px] text-gray-300 dark:text-gray-600">원본: {r.sourcePublishedAt}</div>
                          )}
                        </td>
                        {/* 액션 */}
                        <td className="pr-3 py-2">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {r.ytVideoId && (
                              <button onClick={() => handleRefreshYoutube(r.id)} title="YouTube 정보 새로고침"
                                className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              </button>
                            )}
                            <button onClick={() => handleToggleFavorite(r)}
                              className={`p-1.5 rounded-lg transition-colors ${r.isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}>
                              <svg className="w-3.5 h-3.5" fill={r.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button onClick={() => copyLink(r)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                              {copiedId === r.id
                                ? <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              }
                            </button>
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                            <button onClick={() => openEdit(r)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDeleteId(r.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>{/* end flex-1 content */}
      </div>{/* end flex */}

      {/* 폴더 만들기/이름변경 다이얼로그 */}
      {folderDialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              {folderDialog.mode === 'create' ? '폴더 만들기' : '폴더 이름 변경'}
            </h3>
            <input
              autoFocus
              value={folderDialogName}
              onChange={(e) => setFolderDialogName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFolderSubmit(); if (e.key === 'Escape') setFolderDialog(null) }}
              placeholder="폴더 이름"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-teal-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setFolderDialog(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button onClick={handleFolderSubmit}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors">
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 삭제 확인 */}
      {folderDeleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">폴더 삭제</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{folderDeleteTarget.name}</span> 폴더를 삭제하시겠어요?
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-5">폴더 안의 자료는 미분류로 이동됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setFolderDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button onClick={handleFolderDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">자료 삭제</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">이 자료를 삭제하시겠어요? 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 관리 */}
      {showCatManager && (
        <CategoryManager
          onClose={() => { setShowCatManager(false); router.refresh() }}
          categories={categories.map((c) => ({ ...c }))}
        />
      )}

      {/* 자료 등록/수정 */}
      {showModal && (
        <ResourceModal
          onClose={closeModal}
          resource={editResource ?? undefined}
          categories={modalCats}
          projects={projects}
          tests={tests}
          folders={folders}
          existingResources={resources.map((r) => ({ id: r.id, url: r.url, title: r.title }))}
        />
      )}
    </div>
  )
}
