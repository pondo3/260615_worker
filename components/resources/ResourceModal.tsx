'use client'

import { useActionState, useEffect, useState } from 'react'
import { createResource, updateResource, createResourcesBulk } from '@/app/actions/resources'
import type { BulkResourceItem } from '@/app/actions/resources'
import { fetchYoutubeInfo } from '@/app/actions/youtube'
import type { FolderNode } from '@/app/actions/resourceFolders'

export type ResourceItem = {
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
  projectId: number | null
  testId: number | null
  folderId: number | null
  relatedLinks: { id?: number; title: string; url: string; memo: string | null }[]
}

type RelatedLinkRow = { id?: number; title: string; url: string; memo: string }

type BulkPreviewItem = {
  url: string
  title: string
  isYt: boolean
  ytVideoId: string
  thumbnailUrl: string
  ytChannelName: string
  ytDuration: string
  ytViewCount: string
  ytPublishedAt: string
  fetchStatus: 'idle' | 'loading' | 'success' | 'error'
  fetchError: string
  isDuplicate: boolean
  existingId: number | null
  existingTitle: string
  duplicateAction: 'skip' | 'update' | 'new'
  platform: string
}

type Props = {
  onClose: () => void
  resource?: ResourceItem
  categories: { id: number; name: string; color: string }[]
  projects: { id: number; title: string }[]
  tests: { id: number; title: string }[]
  folders?: FolderNode[]
  existingResources?: { id: number; url: string; title: string }[]
}

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Naver Blog', 'Google Drive', 'Figma', 'Notion', 'GitHub', 'Website', '기타']
const RESOURCE_TYPES = ['영상', '강의', '글', '이미지', '디자인', '코드', '문서', '폴더', '도구', '기타']
const STATUS_OPTIONS = ['확인 전', '보는 중', '완료', '보류', '폐기']
const PRIORITY_OPTIONS = ['낮음', '보통', '높음', '매우 중요']

const STATUS_CLS: Record<string, string> = {
  '확인 전': 'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  '보는 중': 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  '완료':    'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  '보류':    'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  '폐기':    'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
}
const PRIORITY_CLS: Record<string, string> = {
  '낮음':     'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  '보통':     'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  '높음':     'border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  '매우 중요': 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
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

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return null
  }
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

export default function ResourceModal({ onClose, resource, categories, projects, tests, folders = [], existingResources = [] }: Props) {
  const isEdit = !!resource
  const action = isEdit ? updateResource : createResource
  const [state, formAction, pending] = useActionState(action, undefined)

  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  // ── Single form state ──
  const [title, setTitle] = useState(resource?.title ?? '')
  const [url, setUrl] = useState(resource?.url ?? '')
  const [memo, setMemo] = useState(resource?.memo ?? '')
  const [platform, setPlatform] = useState(resource?.platform ?? '')
  const [customPlatform, setCustomPlatform] = useState(resource?.customPlatform ?? '')
  const [resourceType, setResourceType] = useState(resource?.resourceType ?? '')
  const [customResourceType, setCustomResourceType] = useState(resource?.customResourceType ?? '')
  const [status, setStatus] = useState(resource?.status ?? '확인 전')
  const [priority, setPriority] = useState(resource?.priority ?? '보통')
  const [isFavorite, setIsFavorite] = useState(resource?.isFavorite ?? false)
  const [tagInput, setTagInput] = useState(resource?.tags?.join(', ') ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(resource?.thumbnailUrl ?? '')
  const [thumbnailSource, setThumbnailSource] = useState(resource?.thumbnailSource ?? '')
  const [registeredAt, setRegisteredAt] = useState(resource?.registeredAt ?? todayStr())
  const [sourcePublishedAt, setSourcePublishedAt] = useState(resource?.sourcePublishedAt ?? '')
  const [categoryId, setCategoryId] = useState(resource?.categoryId?.toString() ?? '')
  const [projectId, setProjectId] = useState(resource?.projectId?.toString() ?? '')
  const [testId, setTestId] = useState(resource?.testId?.toString() ?? '')
  const [folderId, setFolderId] = useState(resource?.folderId?.toString() ?? '')
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkRow[]>(
    resource?.relatedLinks?.map((l) => ({ id: l.id, title: l.title, url: l.url, memo: l.memo ?? '' })) ?? []
  )
  const [ytVideoId, setYtVideoId] = useState(resource?.ytVideoId ?? '')
  const [ytOriginalTitle, setYtOriginalTitle] = useState(resource?.ytOriginalTitle ?? '')
  const [ytChannelName, setYtChannelName] = useState(resource?.ytChannelName ?? '')
  const [ytChannelId, setYtChannelId] = useState(resource?.ytChannelId ?? '')
  const [ytPublishedAt, setYtPublishedAt] = useState(resource?.ytPublishedAt ?? '')
  const [ytDescription, setYtDescription] = useState(resource?.ytDescription ?? '')
  const [ytDuration, setYtDuration] = useState(resource?.ytDuration ?? '')
  const [ytViewCount, setYtViewCount] = useState(resource?.ytViewCount ?? '')
  const [ytLikeCount, setYtLikeCount] = useState(resource?.ytLikeCount ?? '')
  const [ytCommentCount, setYtCommentCount] = useState(resource?.ytCommentCount ?? '')
  const [ytPrivacyStatus, setYtPrivacyStatus] = useState(resource?.ytPrivacyStatus ?? '')
  const [ytApiLastFetched, setYtApiLastFetched] = useState(resource?.ytApiLastFetched ?? '')
  const [ytApiFetchSuccess, setYtApiFetchSuccess] = useState<boolean | null>(resource?.ytApiFetchSuccess ?? null)
  const [ytApiError, setYtApiError] = useState(resource?.ytApiError ?? '')
  type FetchStatus = 'idle' | 'loading' | 'success' | 'error'
  const [ytFetchStatus, setYtFetchStatus] = useState<FetchStatus>('idle')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')

  // ── Bulk form state ──
  const [bulkStep, setBulkStep] = useState<'input' | 'preview' | 'done'>('input')
  const [urlsText, setUrlsText] = useState('')
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkPlatform, setBulkPlatform] = useState('')
  const [bulkType, setBulkType] = useState('')
  const [bulkStatus, setBulkStatus] = useState('확인 전')
  const [bulkPriority, setBulkPriority] = useState('보통')
  const [bulkTags, setBulkTags] = useState('')
  const [bulkMemo, setBulkMemo] = useState('')
  const [bulkItems, setBulkItems] = useState<BulkPreviewItem[]>([])
  const [bulkFetching, setBulkFetching] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)

  const parsedTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)

  useEffect(() => {
    const ytId = extractYoutubeId(url)
    if (!ytId) {
      setThumbnailUrl((prev) => prev.includes('i.ytimg.com') ? '' : prev)
      setThumbnailSource((prev) => prev === 'youtube' ? '' : prev)
      if (!isEdit) { setYtFetchStatus('idle'); setYtVideoId('') }
      return
    }
    setThumbnailSource('youtube')
    setThumbnailUrl(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`)
    setPlatform((prev) => prev || 'YouTube')
    if (isEdit) return
    setYtVideoId(ytId)
    const timer = setTimeout(async () => {
      setYtFetchStatus('loading')
      try {
        const result = await fetchYoutubeInfo(ytId)
        if (result.success) {
          setYtOriginalTitle(result.title)
          setTitle((prev) => prev || result.title)
          setYtChannelName(result.channelName ?? '')
          setYtChannelId(result.channelId ?? '')
          setYtPublishedAt(result.publishedAt ?? '')
          setYtDescription(result.description ?? '')
          setYtDuration(result.duration ?? '')
          if (result.thumbnailUrl) setThumbnailUrl(result.thumbnailUrl)
          setYtViewCount(result.viewCount ?? '')
          setYtLikeCount(result.likeCount ?? '')
          setYtCommentCount(result.commentCount ?? '')
          setYtPrivacyStatus(result.privacyStatus ?? '')
          setYtApiLastFetched(new Date().toISOString())
          setYtApiFetchSuccess(true)
          setYtApiError('')
          setYtFetchStatus('success')
        } else {
          setYtApiFetchSuccess(false)
          setYtApiError(result.error)
          setYtFetchStatus('error')
        }
      } catch {
        setYtFetchStatus('error')
        setYtApiError('유튜브 정보를 가져오지 못했습니다.')
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleRefresh() {
    if (!ytVideoId) return
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const result = await fetchYoutubeInfo(ytVideoId)
      if (result.success) {
        setYtOriginalTitle(result.title)
        setYtChannelName(result.channelName ?? '')
        setYtChannelId(result.channelId ?? '')
        setYtPublishedAt(result.publishedAt ?? '')
        setYtDescription(result.description ?? '')
        setYtDuration(result.duration ?? '')
        if (result.thumbnailUrl) setThumbnailUrl(result.thumbnailUrl)
        setYtViewCount(result.viewCount ?? '')
        setYtLikeCount(result.likeCount ?? '')
        setYtCommentCount(result.commentCount ?? '')
        setYtPrivacyStatus(result.privacyStatus ?? '')
        setYtApiLastFetched(new Date().toISOString())
        setYtApiFetchSuccess(true)
        setYtApiError('')
        setRefreshMsg('유튜브 영상 정보를 불러왔습니다.')
      } else {
        setYtApiFetchSuccess(false)
        setYtApiError(result.error)
        setRefreshMsg(result.error)
      }
    } catch {
      setRefreshMsg('새로고침에 실패했습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleBulkFetch() {
    const urls = urlsText.split('\n').map((u) => u.trim()).filter(Boolean)
    if (urls.length === 0) return
    setBulkFetching(true)
    const existingMap = new Map(existingResources.map((r) => [r.url, r]))

    const initialItems: BulkPreviewItem[] = urls.map((u) => {
      const ytId = extractYoutubeId(u)
      const existing = existingMap.get(u)
      return {
        url: u,
        title: '',
        isYt: !!ytId,
        ytVideoId: ytId ?? '',
        thumbnailUrl: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '',
        ytChannelName: '',
        ytDuration: '',
        ytViewCount: '',
        ytPublishedAt: '',
        fetchStatus: ytId ? 'loading' as const : 'idle' as const,
        fetchError: '',
        isDuplicate: !!existing,
        existingId: existing?.id ?? null,
        existingTitle: existing?.title ?? '',
        duplicateAction: existing ? 'skip' : 'new',
        platform: ytId ? 'YouTube' : (bulkPlatform || ''),
      }
    })

    setBulkItems(initialItems)
    setBulkStep('preview')

    const updated = [...initialItems]
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      if (!item.isYt || !item.ytVideoId) continue
      try {
        const result = await fetchYoutubeInfo(item.ytVideoId)
        if (result.success) {
          updated[i] = {
            ...item,
            title: result.title,
            ytChannelName: result.channelName ?? '',
            ytDuration: result.duration ?? '',
            ytViewCount: result.viewCount ?? '',
            ytPublishedAt: result.publishedAt ?? '',
            thumbnailUrl: result.thumbnailUrl ?? item.thumbnailUrl,
            fetchStatus: 'success',
          }
        } else {
          updated[i] = { ...item, fetchStatus: 'error', fetchError: result.error }
        }
      } catch {
        updated[i] = { ...item, fetchStatus: 'error', fetchError: '정보를 가져오지 못했습니다.' }
      }
      setBulkItems([...updated])
    }
    setBulkFetching(false)
  }

  async function handleBulkSubmit() {
    setBulkSubmitting(true)
    const tags = bulkTags.split(',').map((t) => t.trim()).filter(Boolean)
    const items: BulkResourceItem[] = bulkItems.map((item) => ({
      url: item.url,
      title: item.title || item.url,
      platform: item.platform || bulkPlatform || null,
      resourceType: bulkType || null,
      status: bulkStatus,
      priority: bulkPriority,
      categoryId: bulkCategoryId ? Number(bulkCategoryId) : null,
      tags,
      memo: bulkMemo || null,
      thumbnailUrl: item.thumbnailUrl || null,
      thumbnailSource: item.isYt ? 'youtube' : null,
      ytVideoId: item.ytVideoId || null,
      ytOriginalTitle: item.isYt ? item.title : null,
      ytChannelName: item.ytChannelName || null,
      ytPublishedAt: item.ytPublishedAt || null,
      ytDuration: item.ytDuration || null,
      ytViewCount: item.ytViewCount || null,
      duplicateAction: item.duplicateAction,
      existingId: item.existingId,
    }))
    const result = await createResourcesBulk(items)
    setBulkResult(result)
    setBulkStep('done')
    setBulkSubmitting(false)
  }

  const linkErrors: Record<number, string> = {}
  const serializedLinks: { id?: number; title: string; url: string; memo: string | null }[] = []
  relatedLinks.forEach((link, i) => {
    const isEmpty = !link.title.trim() && !link.url.trim() && !link.memo.trim()
    if (isEmpty) return
    const normalized = normalizeLinkUrl(link.url)
    if (!normalized) {
      linkErrors[i] = link.url.trim() ? '올바른 URL 형식이 아닙니다.' : 'URL을 입력하세요.'
      return
    }
    serializedLinks.push({
      id: link.id,
      title: link.title.trim() || new URL(normalized).hostname,
      url: normalized,
      memo: link.memo.trim() || null,
    })
  })
  const hasLinkErrors = Object.keys(linkErrors).length > 0

  function addRelatedLinkRow() {
    setRelatedLinks((prev) => [...prev, { title: '', url: '', memo: '' }])
  }
  function updateRelatedLinkRow(i: number, patch: Partial<RelatedLinkRow>) {
    setRelatedLinks((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  function removeRelatedLinkRow(i: number) {
    setRelatedLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  const errors = state && 'errors' in state ? state.errors : {}
  const showYtPanel = !isEdit
    ? (thumbnailSource === 'youtube' || ytFetchStatus !== 'idle')
    : !!(ytVideoId || (thumbnailSource === 'youtube'))

  function flattenFolders(nodes: FolderNode[], depth: number): { id: number; name: string; depth: number }[] {
    return nodes.flatMap((n) => [{ id: n.id, name: n.name, depth }, ...flattenFolders(n.children, depth + 1)])
  }
  const flatFolders = flattenFolders(folders, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl bg-teal-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '자료 수정' : '자료 등록'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isEdit && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            {(['single', 'bulk'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setBulkStep('input') }}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  tab === t
                    ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {t === 'single' ? '단일 등록' : '여러 개 등록'}
              </button>
            ))}
          </div>
        )}

        {/* ── SINGLE FORM ── */}
        {(isEdit || tab === 'single') && (
          <>
          {/* hidden 입력만 가진 form - footer 버튼이 항상 보이도록 분리 */}
          <form id="resource-form" action={formAction}>
            {isEdit && <input type="hidden" name="id" value={resource.id} />}
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="url" value={url} />
            <input type="hidden" name="memo" value={memo} />
            <input type="hidden" name="platform" value={platform} />
            <input type="hidden" name="customPlatform" value={customPlatform} />
            <input type="hidden" name="resourceType" value={resourceType} />
            <input type="hidden" name="customResourceType" value={customResourceType} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="priority" value={priority} />
            <input type="hidden" name="isFavorite" value={String(isFavorite)} />
            <input type="hidden" name="tags" value={JSON.stringify(parsedTags)} />
            <input type="hidden" name="thumbnailUrl" value={thumbnailUrl} />
            <input type="hidden" name="thumbnailSource" value={thumbnailSource} />
            <input type="hidden" name="ytVideoId" value={ytVideoId} />
            <input type="hidden" name="ytOriginalTitle" value={ytOriginalTitle} />
            <input type="hidden" name="ytChannelName" value={ytChannelName} />
            <input type="hidden" name="ytChannelId" value={ytChannelId} />
            <input type="hidden" name="ytPublishedAt" value={ytPublishedAt} />
            <input type="hidden" name="ytDescription" value={ytDescription} />
            <input type="hidden" name="ytDuration" value={ytDuration} />
            <input type="hidden" name="ytViewCount" value={ytViewCount} />
            <input type="hidden" name="ytLikeCount" value={ytLikeCount} />
            <input type="hidden" name="ytCommentCount" value={ytCommentCount} />
            <input type="hidden" name="ytPrivacyStatus" value={ytPrivacyStatus} />
            <input type="hidden" name="ytApiLastFetched" value={ytApiLastFetched} />
            <input type="hidden" name="ytApiFetchSuccess" value={ytApiFetchSuccess === null ? '' : String(ytApiFetchSuccess)} />
            <input type="hidden" name="ytApiError" value={ytApiError} />
            <input type="hidden" name="registeredAt" value={registeredAt} />
            <input type="hidden" name="sourcePublishedAt" value={sourcePublishedAt} />
            <input type="hidden" name="categoryId" value={categoryId} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="testId" value={testId} />
            <input type="hidden" name="folderId" value={folderId} />
            <input type="hidden" name="relatedLinks" value={JSON.stringify(serializedLinks)} />
          </form>

          {/* 별도 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto">

            <div className="px-6 py-5 space-y-5">
              <div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="자료 제목 *"
                  className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-teal-400 pb-2 transition-colors"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">링크 URL *</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
                />
                {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url[0]}</p>}
                {errors.duplicate && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{errors.duplicate[0]}</p>}

                {showYtPanel && (
                  <div className="mt-2 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-3">
                    {!isEdit && ytFetchStatus === 'idle' && thumbnailUrl && (
                      <img src={thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    {!isEdit && ytFetchStatus === 'loading' && (
                      <div className="flex items-start gap-3">
                        {thumbnailUrl && (
                          <img src={thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <p className="text-xs text-red-600 dark:text-red-400">유튜브 정보를 가져오는 중...</p>
                        </div>
                      </div>
                    )}
                    {!isEdit && ytFetchStatus === 'error' && (
                      <div>
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-1">▶ YouTube</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{ytApiError || '유튜브 정보를 가져오지 못했습니다. 직접 입력해주세요.'}</p>
                        {thumbnailUrl && (
                          <img src={thumbnailUrl} alt="" className="w-20 h-14 object-cover rounded-lg mt-2"
                            onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        )}
                      </div>
                    )}
                    {((!isEdit && ytFetchStatus === 'success') || isEdit) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-red-600 dark:text-red-400 flex-shrink-0">▶ YouTube 정보</p>
                          {isEdit && ytVideoId && (
                            <div className="flex items-center gap-2">
                              {refreshMsg && (
                                <p className={`text-[10px] ${refreshMsg.includes('불러왔') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {refreshMsg}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 flex-shrink-0"
                              >
                                {refreshing ? (
                                  <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                정보 새로고침
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          {thumbnailUrl && (
                            <img src={thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            {ytChannelName && <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{ytChannelName}</p>}
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {ytViewCount && <span className="text-[10px] text-gray-500 dark:text-gray-400">조회 {formatCount(ytViewCount)}</span>}
                              {ytDuration && <span className="text-[10px] text-gray-500 dark:text-gray-400">길이 {parseDuration(ytDuration)}</span>}
                              {ytLikeCount && <span className="text-[10px] text-gray-500 dark:text-gray-400">좋아요 {formatCount(ytLikeCount)}</span>}
                            </div>
                            {ytPublishedAt && <p className="text-[10px] text-gray-400 dark:text-gray-500">업로드 {ytPublishedAt.split('T')[0]}</p>}
                            {ytApiLastFetched && <p className="text-[10px] text-gray-300 dark:text-gray-600">갱신 {ytApiLastFetched.split('T')[0]}</p>}
                          </div>
                        </div>
                        {ytOriginalTitle && ytOriginalTitle !== title && (
                          <div className="pt-1 border-t border-red-200 dark:border-red-800/30">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                              원본 제목: <span className="text-gray-500 dark:text-gray-400">{ytOriginalTitle}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {thumbnailSource !== 'youtube' && (
                  <div className="mt-2">
                    <input
                      value={thumbnailUrl}
                      onChange={(e) => { setThumbnailUrl(e.target.value); setThumbnailSource(e.target.value ? 'manual' : '') }}
                      placeholder="썸네일 이미지 URL (선택)"
                      className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                  카테고리 <span className="text-red-400">*</span>
                </label>
                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2">카테고리가 없습니다. 카테고리 관리에서 먼저 추가해주세요.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(categoryId === String(cat.id) ? '' : String(cat.id))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                          categoryId === String(cat.id)
                            ? 'text-white border-transparent'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        style={categoryId === String(cat.id) ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category[0]}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">플랫폼</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PLATFORMS.map((p) => (
                    <button key={p} type="button" onClick={() => setPlatform(platform === p ? '' : p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        platform === p ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
                {platform === '기타' && (
                  <input value={customPlatform} onChange={(e) => setCustomPlatform(e.target.value)}
                    placeholder="플랫폼 직접 입력"
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors" />
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">자료 유형</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {RESOURCE_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setResourceType(resourceType === t ? '' : t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        resourceType === t ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                {resourceType === '기타' && (
                  <input value={customResourceType} onChange={(e) => setCustomResourceType(e.target.value)}
                    placeholder="유형 직접 입력"
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">상태</label>
                  <div className="flex flex-col gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setStatus(s)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                          status === s ? STATUS_CLS[s] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">중요도</label>
                  <div className="flex flex-col gap-1.5">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                          priority === p ? PRIORITY_CLS[p] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">등록일 <span className="text-red-400">*</span></label>
                  <input type="date" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">원본 업로드일</label>
                  <input type="date" value={sourcePublishedAt} onChange={(e) => setSourcePublishedAt(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">태그</label>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  placeholder="쉼표로 구분 (예: 쇼츠, 후킹, 벤치마킹)"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors" />
                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parsedTags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs rounded-lg font-medium">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">메모</label>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                  placeholder="참고 내용, 용도, 활용 방법 등" rows={3}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">관련 링크</label>
                  <button type="button" onClick={addRelatedLinkRow}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                    + 링크 추가
                  </button>
                </div>
                {relatedLinks.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1">유튜브 참고 영상, 블로그 글, 디자인 레퍼런스 등 관련 링크를 추가해보세요.</p>
                ) : (
                  <div className="space-y-2">
                    {relatedLinks.map((link, i) => (
                      <div key={link.id ?? `new-${i}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={link.title}
                            onChange={(e) => updateRelatedLinkRow(i, { title: e.target.value })}
                            placeholder="링크 제목 (예: 참고 영상)"
                            className="flex-1 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
                          />
                          <button type="button" onClick={() => removeRelatedLinkRow(i)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <input
                          value={link.url}
                          onChange={(e) => updateRelatedLinkRow(i, { url: e.target.value })}
                          placeholder="https://..."
                          className="w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
                        />
                        {linkErrors[i] && <p className="text-[10px] text-red-500">{linkErrors[i]}</p>}
                        <input
                          value={link.memo}
                          onChange={(e) => updateRelatedLinkRow(i, { memo: e.target.value })}
                          placeholder="메모 (선택)"
                          className="w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  isFavorite
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-amber-300 hover:text-amber-500'
                }`}>
                <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                {isFavorite ? '즐겨찾기 등록됨' : '즐겨찾기에 추가'}
              </button>

              {folders.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">폴더</label>
                  <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors">
                    <option value="">미분류</option>
                    {flatFolders.map((f) => <option key={f.id} value={f.id}>{"  ".repeat(f.depth)}{f.depth > 0 ? "L " : ""}{f.name}</option>)}
                  </select>
                </div>
              )}

              {(projects.length > 0 || tests.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {projects.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">관련 프로젝트</label>
                      <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors">
                        <option value="">연결 안 함</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>
                  )}
                  {tests.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">관련 테스트</label>
                      <select value={testId} onChange={(e) => setTestId(e.target.value)}
                        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors">
                        <option value="">연결 안 함</option>
                        {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
            </div>
          </div>{/* 스크롤 영역 끝 */}

          {/* Footer - 항상 고정 */}
          <div className="flex-shrink-0 px-6 pb-5 pt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" form="resource-form" disabled={pending || hasLinkErrors}
              title={hasLinkErrors ? '관련 링크의 URL을 확인해주세요.' : undefined}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-50">
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '자료 등록'}
            </button>
          </div>
          </>
        )}

        {/* ── BULK FORM ── */}
        {!isEdit && tab === 'bulk' && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

            {/* ── 입력 단계 ── */}
            {bulkStep === 'input' && (
              <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    URL 목록 <span className="text-gray-400 font-normal normal-case">(한 줄에 하나씩)</span>
                  </label>
                  <textarea
                    value={urlsText}
                    onChange={(e) => setUrlsText(e.target.value)}
                    placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.youtube.com/watch?v=...\nhttps://example.com/article'}
                    rows={6}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors resize-none font-mono"
                  />
                  {urlsText.trim() && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {urlsText.split('\n').map((u) => u.trim()).filter(Boolean).length}개 URL
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">공통 카테고리</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBulkCategoryId('')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                        !bulkCategoryId
                          ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-transparent'
                          : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      없음
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setBulkCategoryId(String(cat.id))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                          bulkCategoryId === String(cat.id)
                            ? 'text-white border-transparent'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                        style={bulkCategoryId === String(cat.id) ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">공통 플랫폼</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setBulkPlatform('')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!bulkPlatform ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                      자동
                    </button>
                    {PLATFORMS.map((p) => (
                      <button key={p} type="button" onClick={() => setBulkPlatform(bulkPlatform === p ? '' : p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${bulkPlatform === p ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">공통 자료 유형</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setBulkType('')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!bulkType ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                      없음
                    </button>
                    {RESOURCE_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => setBulkType(bulkType === t ? '' : t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${bulkType === t ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">공통 상태</label>
                    <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors">
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">공통 중요도</label>
                    <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors">
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">공통 태그</label>
                  <input value={bulkTags} onChange={(e) => setBulkTags(e.target.value)}
                    placeholder="쉼표로 구분 (예: 쇼츠, 후킹)"
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">공통 메모</label>
                  <textarea value={bulkMemo} onChange={(e) => setBulkMemo(e.target.value)}
                    placeholder="모든 자료에 공통으로 적용될 메모" rows={2}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-teal-400 transition-colors resize-none" />
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkFetch}
                    disabled={!urlsText.trim() || bulkFetching}
                    className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {bulkFetching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        정보 가져오는 중...
                      </>
                    ) : '정보 가져오기 →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── 미리보기 단계 ── */}
            {bulkStep === 'preview' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {bulkItems.length}개 자료 미리보기
                    </p>
                    <button type="button" onClick={() => setBulkStep('input')}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                      ← 뒤로
                    </button>
                  </div>
                  {bulkFetching && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] text-teal-600 dark:text-teal-400">유튜브 정보 가져오는 중...</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {bulkItems.map((item, idx) => (
                    <div key={idx} className="px-4 py-3">
                      <div className="flex gap-3">
                        {/* 썸네일 */}
                        <div className="w-16 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : (
                            <span className="text-lg">{item.isYt ? '▶' : '🔗'}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 제목 편집 */}
                          {item.fetchStatus === 'loading' ? (
                            <div className="flex items-center gap-1.5 h-7">
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              <span className="text-xs text-gray-400">정보 가져오는 중...</span>
                            </div>
                          ) : (
                            <input
                              value={item.title}
                              onChange={(e) => {
                                const next = [...bulkItems]
                                next[idx] = { ...item, title: e.target.value }
                                setBulkItems(next)
                              }}
                              placeholder={item.fetchStatus === 'error' ? '제목을 직접 입력하세요' : item.url}
                              className="w-full text-xs font-semibold bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 border-b border-gray-200 dark:border-gray-700 focus:border-teal-400 pb-0.5 transition-colors"
                            />
                          )}

                          {/* URL + 메타 정보 */}
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{item.url}</p>
                          {item.fetchStatus === 'success' && (
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {item.ytChannelName && <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.ytChannelName}</span>}
                              {item.ytDuration && <span className="text-[10px] text-gray-400">⏱ {parseDuration(item.ytDuration)}</span>}
                              {item.ytViewCount && <span className="text-[10px] text-gray-400">👁 {formatCount(item.ytViewCount)}</span>}
                            </div>
                          )}
                          {item.fetchStatus === 'error' && (
                            <p className="text-[10px] text-amber-500 mt-0.5">{item.fetchError}</p>
                          )}

                          {/* 중복 표시 */}
                          {item.isDuplicate && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded">
                                중복
                              </span>
                              <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{item.existingTitle}</span>
                              <div className="flex gap-1">
                                {(['skip', 'update', 'new'] as const).map((action) => (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => {
                                      const next = [...bulkItems]
                                      next[idx] = { ...item, duplicateAction: action }
                                      setBulkItems(next)
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                      item.duplicateAction === action
                                        ? action === 'skip' ? 'bg-gray-600 text-white' : action === 'update' ? 'bg-blue-500 text-white' : 'bg-teal-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {action === 'skip' ? '제외' : action === 'update' ? '업데이트' : '새로 등록'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 flex gap-2">
                  <button type="button" onClick={() => setBulkStep('input')}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={bulkSubmitting || bulkFetching || bulkItems.every((i) => i.duplicateAction === 'skip')}
                    className="flex-1 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {bulkSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        등록 중...
                      </>
                    ) : `${bulkItems.filter((i) => i.duplicateAction !== 'skip').length}개 일괄 등록`}
                  </button>
                </div>
              </div>
            )}

            {/* ── 완료 단계 ── */}
            {bulkStep === 'done' && bulkResult && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-4">
                <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                  <svg className="w-7 h-7 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-1">일괄 등록 완료</p>
                  <div className="flex gap-4 justify-center mt-2">
                    {bulkResult.created > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-black text-teal-600 dark:text-teal-400">{bulkResult.created}</p>
                        <p className="text-[10px] text-gray-400">신규 등록</p>
                      </div>
                    )}
                    {bulkResult.updated > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{bulkResult.updated}</p>
                        <p className="text-[10px] text-gray-400">업데이트</p>
                      </div>
                    )}
                    {bulkResult.skipped > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-black text-gray-400">{bulkResult.skipped}</p>
                        <p className="text-[10px] text-gray-400">제외</p>
                      </div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={onClose}
                  className="mt-2 px-8 py-2.5 rounded-xl bg-teal-500 text-sm font-bold text-white hover:bg-teal-600 transition-colors">
                  닫기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
