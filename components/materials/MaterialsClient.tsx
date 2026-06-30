'use client'

import { useState, useMemo } from 'react'
import {
  addChannel, toggleChannel, deleteChannel,
  saveCollectionRules, deleteCollectionRule,
  getMaterials, registerMaterial, updateMaterial, deleteMaterial, bulkDeleteMaterials,
  quickUpdateStatus, quickUpdateUsage,
  fetchUrlMetadata, translateToKorean, checkDuplicate,
} from '@/app/actions/materials'

// ─── Types ────────────────────────────────────────────────────────────────────

type MatItem = {
  id: number
  url: string | null
  platform: string
  videoId: string | null
  originalTitle: string | null
  translatedTitle: string | null
  isTranslated: boolean
  translationEdited: boolean
  channelName: string | null
  channelId: string | null
  thumbnailUrl: string | null
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
  uploadedAt: string | null
  category: string | null
  tags: string[]
  memo: string | null
  scriptIdea: string | null
  importance: string
  status: string
  usageStatus: string
  plannedUseAt: string | null
  actualUsedAt: string | null
  collectedAt: string
}

type Channel = {
  id: number; channelId: string; channelName: string
  thumbnailUrl: string; isActive: boolean; createdAt: string
}
type Rule = {
  id: number; channelDbId: number; channelName: string; channelId: string
  minViews: number; maxDaysOld: number; minLikes: number; minComments: number
  scheduleHour: number | null; isActive: boolean; createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'naver', 'website']
const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram',
  twitter: 'Twitter/X', facebook: 'Facebook', naver: '네이버', website: '웹사이트',
}
const PLATFORM_COLOR: Record<string, string> = {
  youtube: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  tiktok: 'bg-gray-900 text-white dark:bg-black',
  instagram: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  twitter: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  facebook: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  naver: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  website: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

const STATUSES = ['수집됨','검토 중','쓸만함','사용 예정','대본 작성 중','제작 중','사용 완료','보류','폐기','중복']
const STATUS_COLOR: Record<string, string> = {
  '수집됨': 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  '검토 중': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  '쓸만함': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  '사용 예정': 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  '대본 작성 중': 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  '제작 중': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  '사용 완료': 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  '보류': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  '폐기': 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  '중복': 'bg-gray-200 dark:bg-gray-700 text-gray-500',
}

const USAGE_STATUSES = ['미사용','사용 예정','사용 완료','재사용 가능','사용 금지']
const USAGE_COLOR: Record<string, string> = {
  '미사용': 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  '사용 예정': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  '사용 완료': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  '재사용 가능': 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  '사용 금지': 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return '-'
  return new Date(s).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
function fmtNum(n: number | null | undefined) {
  if (n == null) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${color}`}>{text}</span>
}

// ─── Register Modal ───────────────────────────────────────────────────────────

function RegisterModal({ onClose, onDone }: { onClose: () => void; onDone: (mat: MatItem) => void }) {
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dupInfo, setDupInfo] = useState<{ isDuplicate: boolean; id?: number; title?: string | null } | null>(null)
  const [form, setForm] = useState({
    platform: 'website', videoId: '', originalTitle: '', translatedTitle: '',
    isTranslated: false, channelName: '', thumbnailUrl: '',
    viewCount: '', likeCount: '', commentCount: '', uploadedAt: '',
    category: '', tags: '', memo: '', scriptIdea: '', importance: '보통',
    status: '수집됨', usageStatus: '미사용', plannedUseAt: '',
  })

  async function handleFetch() {
    if (!url.trim()) return
    setFetching(true)
    setDupInfo(null)

    // duplicate check
    const dup = await checkDuplicate(url.trim())
    if (dup.isDuplicate) {
      setDupInfo(dup)
      setFetching(false)
      return
    }

    const meta = await fetchUrlMetadata(url.trim())
    let translated = ''
    if (meta.originalTitle) {
      const t = await translateToKorean(meta.originalTitle)
      if (t) { translated = t }
    }
    setForm((prev) => ({
      ...prev,
      platform: meta.platform,
      videoId: meta.videoId ?? '',
      originalTitle: meta.originalTitle ?? '',
      translatedTitle: translated,
      isTranslated: !!translated,
      channelName: meta.channelName ?? '',
      thumbnailUrl: meta.thumbnailUrl ?? '',
      viewCount: meta.viewCount != null ? String(meta.viewCount) : '',
      likeCount: meta.likeCount != null ? String(meta.likeCount) : '',
      commentCount: meta.commentCount != null ? String(meta.commentCount) : '',
      uploadedAt: meta.uploadedAt ? new Date(meta.uploadedAt).toISOString().slice(0, 10) : '',
    }))
    setFetching(false)
  }

  async function handleSave() {
    if (!url.trim()) return
    setSaving(true)
    const mat = await registerMaterial({
      url: url.trim(),
      platform: form.platform,
      videoId: form.videoId || null,
      originalTitle: form.originalTitle || null,
      translatedTitle: form.translatedTitle || null,
      isTranslated: form.isTranslated,
      channelName: form.channelName || null,
      thumbnailUrl: form.thumbnailUrl || null,
      viewCount: form.viewCount ? Number(form.viewCount) : null,
      likeCount: form.likeCount ? Number(form.likeCount) : null,
      commentCount: form.commentCount ? Number(form.commentCount) : null,
      uploadedAt: form.uploadedAt || null,
      category: form.category || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      memo: form.memo || null,
      scriptIdea: form.scriptIdea || null,
      importance: form.importance,
      status: form.status,
      usageStatus: form.usageStatus,
      plannedUseAt: form.plannedUseAt || null,
    })
    setSaving(false)
    onDone({
      ...mat,
      url: mat.url ?? null,
      videoId: mat.videoId ?? null,
      originalTitle: mat.originalTitle ?? null,
      translatedTitle: mat.translatedTitle ?? null,
      channelName: mat.channelName ?? null,
      channelId: mat.channelId ?? null,
      thumbnailUrl: mat.thumbnailUrl ?? null,
      viewCount: mat.viewCount ?? null,
      likeCount: mat.likeCount ?? null,
      commentCount: mat.commentCount ?? null,
      uploadedAt: mat.uploadedAt?.toISOString() ?? null,
      category: mat.category ?? null,
      tags: mat.tags as string[],
      memo: mat.memo ?? null,
      scriptIdea: mat.scriptIdea ?? null,
      plannedUseAt: mat.plannedUseAt?.toISOString() ?? null,
      actualUsedAt: mat.actualUsedAt?.toISOString() ?? null,
      collectedAt: mat.collectedAt.toISOString(),
    })
  }

  const input = 'w-full text-sm px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
  const label = 'text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-10 px-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mb-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">소재 등록</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* URL */}
          <div>
            <label className={label}>URL *</label>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                placeholder="https://..." className={`${input} flex-1`} />
              <button onClick={handleFetch} disabled={fetching || !url.trim()}
                className="px-4 py-1.5 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap">
                {fetching ? '가져오는 중...' : '정보 가져오기'}
              </button>
            </div>
            {dupInfo?.isDuplicate && (
              <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">이미 등록된 소재입니다.</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{dupInfo.title}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setDupInfo(null)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors">
                    그래도 등록
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail + basic info */}
          <div className="flex gap-4">
            {form.thumbnailUrl && (
              <img
                src={form.thumbnailUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-28 h-16 object-cover rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className={label}>플랫폼</label>
                <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))} className={input}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p] ?? p}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>중요도</label>
                <select value={form.importance} onChange={(e) => setForm((p) => ({ ...p, importance: e.target.value }))} className={input}>
                  {['낮음','보통','높음','매우 높음'].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Titles */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-bold text-white block mb-1">
                한글 제목 {form.isTranslated && <span className="text-blue-400 font-normal">(자동 번역)</span>}
              </label>
              <input value={form.translatedTitle} onChange={(e) => setForm((p) => ({ ...p, translatedTitle: e.target.value, translationEdited: true }))}
                className={`${input} font-semibold`} placeholder="한글 제목을 입력하세요" />
            </div>
            <div>
              <label className={label}>원본 제목</label>
              <input value={form.originalTitle} onChange={(e) => setForm((p) => ({ ...p, originalTitle: e.target.value }))} className={input} />
            </div>
          </div>

          {/* Channel + stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>채널명/계정명</label>
              <input value={form.channelName} onChange={(e) => setForm((p) => ({ ...p, channelName: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>업로드일</label>
              <input type="date" value={form.uploadedAt} onChange={(e) => setForm((p) => ({ ...p, uploadedAt: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>조회수</label>
              <input type="number" value={form.viewCount} onChange={(e) => setForm((p) => ({ ...p, viewCount: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>좋아요</label>
              <input type="number" value={form.likeCount} onChange={(e) => setForm((p) => ({ ...p, likeCount: e.target.value }))} className={input} />
            </div>
          </div>

          {/* Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>카테고리</label>
              <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="예: 리뷰, 튜토리얼" className={input} />
            </div>
            <div>
              <label className={label}>태그 (쉼표 구분)</label>
              <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="태그1, 태그2" className={input} />
            </div>
            <div>
              <label className={label}>상태</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={input}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>사용 여부</label>
              <select value={form.usageStatus} onChange={(e) => setForm((p) => ({ ...p, usageStatus: e.target.value }))} className={input}>
                {USAGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>사용 예정일</label>
              <input type="date" value={form.plannedUseAt} onChange={(e) => setForm((p) => ({ ...p, plannedUseAt: e.target.value }))} className={input} />
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className={label}>메모</label>
            <textarea value={form.memo} onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))} rows={2}
              className={`${input} resize-none`} />
          </div>
          <div>
            <label className={label}>대본 아이디어</label>
            <textarea value={form.scriptIdea} onChange={(e) => setForm((p) => ({ ...p, scriptIdea: e.target.value }))} rows={2}
              className={`${input} resize-none`} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
          <button onClick={handleSave} disabled={saving || !url.trim()}
            className="px-5 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ mat, onClose, onUpdate, onDelete }: {
  mat: MatItem
  onClose: () => void
  onUpdate: (id: number, data: Partial<MatItem>) => void
  onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    originalTitle: mat.originalTitle ?? '',
    translatedTitle: mat.translatedTitle ?? '',
    channelName: mat.channelName ?? '',
    category: mat.category ?? '',
    tags: mat.tags.join(', '),
    memo: mat.memo ?? '',
    scriptIdea: mat.scriptIdea ?? '',
    importance: mat.importance,
    status: mat.status,
    usageStatus: mat.usageStatus,
    plannedUseAt: mat.plannedUseAt ? mat.plannedUseAt.slice(0, 10) : '',
    actualUsedAt: mat.actualUsedAt ? mat.actualUsedAt.slice(0, 10) : '',
  })

  async function save() {
    setSaving(true)
    const data = {
      originalTitle: form.originalTitle || null,
      translatedTitle: form.translatedTitle || null,
      translationEdited: true,
      channelName: form.channelName || null,
      category: form.category || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      memo: form.memo || null,
      scriptIdea: form.scriptIdea || null,
      importance: form.importance,
      status: form.status,
      usageStatus: form.usageStatus,
      plannedUseAt: form.plannedUseAt || null,
      actualUsedAt: form.actualUsedAt || null,
    }
    await updateMaterial(mat.id, data)
    onUpdate(mat.id, {
      ...data,
      tags: data.tags,
      plannedUseAt: form.plannedUseAt ? new Date(form.plannedUseAt).toISOString() : null,
      actualUsedAt: form.actualUsedAt ? new Date(form.actualUsedAt).toISOString() : null,
    })
    setSaving(false)
    setEditing(false)
  }

  async function quickStatus(status: string) {
    await quickUpdateStatus(mat.id, status)
    onUpdate(mat.id, { status })
  }
  async function quickUsage(usageStatus: string) {
    await quickUpdateUsage(mat.id, usageStatus)
    onUpdate(mat.id, {
      usageStatus,
      actualUsedAt: usageStatus === '사용 완료' ? new Date().toISOString() : mat.actualUsedAt,
    })
  }

  const tf = 'w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500'
  const row = 'flex items-start gap-2'
  const lbl = 'text-[10px] font-semibold text-gray-400 dark:text-gray-500 w-16 flex-shrink-0 pt-1'

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <span className="text-sm font-bold text-gray-900 dark:text-white">소재 상세</span>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
              <button onClick={save} disabled={saving} className="px-2 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">{saving ? '저장 중' : '저장'}</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">수정</button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Thumbnail */}
        {mat.thumbnailUrl && (
          <img
            src={mat.thumbnailUrl}
            alt={mat.originalTitle ?? ''}
            referrerPolicy="no-referrer"
            className="w-full rounded-xl object-cover aspect-video bg-gray-100 dark:bg-gray-800"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Platform + status badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge text={PLATFORM_LABEL[mat.platform] ?? mat.platform} color={PLATFORM_COLOR[mat.platform] ?? PLATFORM_COLOR.website} />
          <Badge text={mat.status} color={STATUS_COLOR[mat.status] ?? STATUS_COLOR['수집됨']} />
          <Badge text={mat.usageStatus} color={USAGE_COLOR[mat.usageStatus] ?? USAGE_COLOR['미사용']} />
        </div>

        {/* Titles */}
        {editing ? (
          <div className="space-y-2">
            <div><p className={lbl.replace('w-16', 'w-full').replace('pt-1', '')}>원본 제목</p><input value={form.originalTitle} onChange={(e) => setForm((p) => ({ ...p, originalTitle: e.target.value }))} className={tf} /></div>
            <div><p className={lbl.replace('w-16', 'w-full').replace('pt-1', '')}>한글 제목</p><input value={form.translatedTitle} onChange={(e) => setForm((p) => ({ ...p, translatedTitle: e.target.value }))} className={tf} /></div>
          </div>
        ) : (
          <div className="space-y-1">
            {mat.originalTitle && <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{mat.originalTitle}</p>}
            {mat.translatedTitle && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{mat.translatedTitle}</p>}
          </div>
        )}

        {/* Link */}
        {mat.url && (
          <button
            onClick={() => window.open(mat.url!, '_blank', 'noopener,noreferrer')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span className="truncate">{mat.url}</span>
          </button>
        )}

        {/* Meta rows */}
        <div className="space-y-1.5">
          {mat.channelName && <div className={row}><span className={lbl}>채널</span><span className="text-xs text-gray-700 dark:text-gray-300">{mat.channelName}</span></div>}
          <div className={row}><span className={lbl}>조회수</span><span className="text-xs text-gray-700 dark:text-gray-300">{fmtNum(mat.viewCount)}</span></div>
          <div className={row}><span className={lbl}>좋아요</span><span className="text-xs text-gray-700 dark:text-gray-300">{fmtNum(mat.likeCount)}</span></div>
          <div className={row}><span className={lbl}>댓글</span><span className="text-xs text-gray-700 dark:text-gray-300">{fmtNum(mat.commentCount)}</span></div>
          <div className={row}><span className={lbl}>업로드</span><span className="text-xs text-gray-700 dark:text-gray-300">{fmtDate(mat.uploadedAt)}</span></div>
          <div className={row}><span className={lbl}>등록일</span><span className="text-xs text-gray-700 dark:text-gray-300">{fmtDate(mat.collectedAt)}</span></div>
        </div>

        {/* Editable fields */}
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-[10px] font-semibold text-gray-400 mb-1">상태</p>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={tf}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><p className="text-[10px] font-semibold text-gray-400 mb-1">사용 여부</p>
                <select value={form.usageStatus} onChange={(e) => setForm((p) => ({ ...p, usageStatus: e.target.value }))} className={tf}>
                  {USAGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><p className="text-[10px] font-semibold text-gray-400 mb-1">사용 예정일</p>
                <input type="date" value={form.plannedUseAt} onChange={(e) => setForm((p) => ({ ...p, plannedUseAt: e.target.value }))} className={tf} />
              </div>
              <div><p className="text-[10px] font-semibold text-gray-400 mb-1">실제 사용일</p>
                <input type="date" value={form.actualUsedAt} onChange={(e) => setForm((p) => ({ ...p, actualUsedAt: e.target.value }))} className={tf} />
              </div>
            </div>
            <div><p className="text-[10px] font-semibold text-gray-400 mb-1">카테고리</p><input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={tf} /></div>
            <div><p className="text-[10px] font-semibold text-gray-400 mb-1">태그 (쉼표 구분)</p><input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className={tf} /></div>
            <div><p className="text-[10px] font-semibold text-gray-400 mb-1">메모</p><textarea value={form.memo} onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))} rows={2} className={`${tf} resize-none`} /></div>
            <div><p className="text-[10px] font-semibold text-gray-400 mb-1">대본 아이디어</p><textarea value={form.scriptIdea} onChange={(e) => setForm((p) => ({ ...p, scriptIdea: e.target.value }))} rows={3} className={`${tf} resize-none`} /></div>
          </div>
        ) : (
          <div className="space-y-2">
            {mat.plannedUseAt && <div className={row}><span className={lbl}>예정일</span><span className="text-xs text-violet-600 dark:text-violet-400 font-medium">{fmtDate(mat.plannedUseAt)}</span></div>}
            {mat.actualUsedAt && <div className={row}><span className={lbl}>사용일</span><span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{fmtDate(mat.actualUsedAt)}</span></div>}
            {mat.category && <div className={row}><span className={lbl}>카테고리</span><span className="text-xs text-gray-700 dark:text-gray-300">{mat.category}</span></div>}
            {mat.tags.length > 0 && <div className={row}><span className={lbl}>태그</span><div className="flex flex-wrap gap-1">{mat.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{t}</span>)}</div></div>}
            {mat.memo && <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3"><p className="text-[10px] font-semibold text-gray-400 mb-1">메모</p><p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mat.memo}</p></div>}
            {mat.scriptIdea && <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3"><p className="text-[10px] font-semibold text-violet-400 mb-1">대본 아이디어</p><p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{mat.scriptIdea}</p></div>}
          </div>
        )}

        {/* Quick action buttons */}
        {!editing && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">빠른 작업</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => quickUsage('사용 예정')} className="text-xs px-2 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-colors">사용 예정으로</button>
              <button onClick={() => quickUsage('사용 완료')} className="text-xs px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">사용 완료 처리</button>
              <button onClick={() => quickStatus('보류')} className="text-xs px-2 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 transition-colors">보류</button>
              <button onClick={() => quickStatus('폐기')} className="text-xs px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors">폐기</button>
            </div>
            <button onClick={() => onDelete(mat.id)}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function MatRow({ mat, checked, onCheck, onSelect, selected }: {
  mat: MatItem
  checked: boolean
  onCheck: () => void
  onSelect: () => void
  selected: boolean
}) {
  return (
    <tr
      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${selected ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`}
      onClick={onSelect}
    >
      <td className="px-3 py-2 sticky left-0 bg-inherit">
        <input
          type="checkbox"
          checked={checked}
          onChange={onCheck}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded cursor-pointer"
        />
      </td>
      <td className="px-2 py-2">
        {mat.thumbnailUrl ? (
          <img
            src={mat.thumbnailUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-16 h-9 object-cover rounded-lg bg-gray-100 dark:bg-gray-800"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
          />
        ) : null}
        <div className={`w-16 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600 text-[9px] ${mat.thumbnailUrl ? 'hidden' : ''}`}>없음</div>
      </td>
      <td className="px-2 py-2">
        <Badge text={PLATFORM_LABEL[mat.platform] ?? mat.platform} color={PLATFORM_COLOR[mat.platform] ?? PLATFORM_COLOR.website} />
      </td>
      <td className="px-2 py-2 max-w-[160px]">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-2 leading-snug">{mat.originalTitle || '-'}</p>
      </td>
      <td className="px-2 py-2 max-w-[200px]">
        <p className="text-xs text-gray-900 dark:text-white font-semibold line-clamp-2 leading-snug">
          {mat.translatedTitle || mat.originalTitle || '-'}
        </p>
      </td>
      <td className="px-2 py-2">
        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap truncate max-w-[100px]">{mat.channelName || '-'}</p>
      </td>
      <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtNum(mat.viewCount)}</td>
      <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtNum(mat.likeCount)}</td>
      <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(mat.collectedAt)}</td>
      <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(mat.uploadedAt)}</td>
      <td className="px-2 py-2"><Badge text={mat.usageStatus} color={USAGE_COLOR[mat.usageStatus] ?? USAGE_COLOR['미사용']} /></td>
      <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(mat.plannedUseAt)}</td>
      <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(mat.actualUsedAt)}</td>
      <td className="px-2 py-2"><Badge text={mat.status} color={STATUS_COLOR[mat.status] ?? STATUS_COLOR['수집됨']} /></td>
      <td className="px-2 py-2">
        <div className="flex flex-wrap gap-0.5 max-w-[120px]">
          {mat.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 whitespace-nowrap">{t}</span>)}
          {mat.tags.length > 2 && <span className="text-[9px] text-gray-400">+{mat.tags.length - 2}</span>}
        </div>
      </td>
      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
        {mat.url && (
          <button onClick={() => window.open(mat.url!, '_blank', 'noopener,noreferrer')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function MaterialsClient({
  initialChannels,
  initialRules,
  initialMaterials,
}: {
  initialChannels: Channel[]
  initialRules: Rule[]
  initialMaterials: MatItem[]
}) {
  const [tab, setTab] = useState<'list' | 'channel'>('list')
  const [materials, setMaterials] = useState<MatItem[]>(initialMaterials)
  const [channels] = useState<Channel[]>(initialChannels)
  const [rules] = useState<Rule[]>(initialRules)
  const [selected, setSelected] = useState<MatItem | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [showRegister, setShowRegister] = useState(false)

  // Filters
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterUsage, setFilterUsage] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterChannel, setFilterChannel] = useState('all')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const uniqueChannels = useMemo(
    () => [...new Set(materials.map((m) => m.channelName).filter(Boolean) as string[])].sort(),
    [materials]
  )

  const filtered = useMemo(() => {
    const base = materials.filter((m) => {
      if (filterPlatform !== 'all' && m.platform !== filterPlatform) return false
      if (filterUsage !== 'all' && m.usageStatus !== filterUsage) return false
      if (filterStatus !== 'all' && m.status !== filterStatus) return false
      if (filterChannel !== 'all' && m.channelName !== filterChannel) return false
      if (search) {
        const q = search.toLowerCase()
        const inTitle = (m.originalTitle ?? '').toLowerCase().includes(q)
        const inKo = (m.translatedTitle ?? '').toLowerCase().includes(q)
        const inCh = (m.channelName ?? '').toLowerCase().includes(q)
        const inTag = m.tags.some((t) => t.toLowerCase().includes(q))
        if (!inTitle && !inKo && !inCh && !inTag) return false
      }
      return true
    })
    return base.sort((a, b) => {
      const ta = new Date(a.collectedAt).getTime()
      const tb = new Date(b.collectedAt).getTime()
      return sortDir === 'desc' ? tb - ta : ta - tb
    })
  }, [materials, filterPlatform, filterUsage, filterStatus, filterChannel, search, sortDir])

  function handleMaterialAdded(mat: MatItem) {
    setMaterials((prev) => [mat, ...prev])
    setShowRegister(false)
    setSelected(mat)
  }

  function handleUpdate(id: number, data: Partial<MatItem>) {
    setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m))
    setSelected((prev) => prev?.id === id ? { ...prev, ...data } : prev)
  }

  async function handleDelete(id: number) {
    if (!confirm('이 소재를 삭제할까요?')) return
    try {
      await deleteMaterial(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`선택한 ${checked.size}개를 삭제할까요?`)) return
    try {
      const ids = Array.from(checked)
      await bulkDeleteMaterials(ids)
      setMaterials((prev) => prev.filter((m) => !ids.includes(m.id)))
      setChecked(new Set())
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  async function refreshList() {
    const fresh = await getMaterials()
    setMaterials(fresh.map((m) => ({
      ...m,
      url: m.url ?? null,
      videoId: m.videoId ?? null,
      originalTitle: m.originalTitle ?? null,
      translatedTitle: m.translatedTitle ?? null,
      channelName: m.channelName ?? null,
      channelId: m.channelId ?? null,
      thumbnailUrl: m.thumbnailUrl ?? null,
      viewCount: m.viewCount ?? null,
      likeCount: m.likeCount ?? null,
      commentCount: m.commentCount ?? null,
      uploadedAt: m.uploadedAt?.toISOString() ?? null,
      category: m.category ?? null,
      tags: m.tags as string[],
      memo: m.memo ?? null,
      scriptIdea: m.scriptIdea ?? null,
      plannedUseAt: m.plannedUseAt?.toISOString() ?? null,
      actualUsedAt: m.actualUsedAt?.toISOString() ?? null,
      collectedAt: m.collectedAt.toISOString(),
    })))
  }

  const allChecked = filtered.length > 0 && filtered.every((m) => checked.has(m.id))
  const toggleAllChecked = () => {
    if (allChecked) setChecked(new Set())
    else setChecked(new Set(filtered.map((m) => m.id)))
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">소재 관리</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">콘텐츠 제작 소재를 모으고 관리합니다</p>
          </div>
          <div className="flex items-center gap-2">
            {checked.size > 0 && (
              <button onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
                선택 삭제 ({checked.size})
              </button>
            )}
            <button onClick={refreshList} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="새로고침">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={() => setShowRegister(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              소재 등록
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([['list', '소재 목록'], ['channel', '채널 설정']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${tab === v ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {l} {v === 'list' && <span className="ml-1 text-[10px] text-gray-400">({materials.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && (
        <>
          {/* Filter bar */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제목, 채널, 태그 검색..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-48" />
            </div>
            {[
              { label: '플랫폼', value: filterPlatform, set: setFilterPlatform, options: [['all','전체'], ...PLATFORMS.map((p) => [p, PLATFORM_LABEL[p] ?? p])] },
              { label: '사용여부', value: filterUsage, set: setFilterUsage, options: [['all','전체'], ...USAGE_STATUSES.map((s) => [s, s])] },
              { label: '상태', value: filterStatus, set: setFilterStatus, options: [['all','전체'], ...STATUSES.map((s) => [s, s])] },
            ].map(({ label, value, set, options }) => (
              <select key={label} value={value} onChange={(e) => set(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {uniqueChannels.length > 0 && (
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none max-w-[140px]">
                <option value="all">채널 전체</option>
                {uniqueChannels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
            )}
            {(filterPlatform !== 'all' || filterUsage !== 'all' || filterStatus !== 'all' || filterChannel !== 'all' || search) && (
              <button onClick={() => { setFilterPlatform('all'); setFilterUsage('all'); setFilterStatus('all'); setFilterChannel('all'); setSearch('') }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                초기화
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">{filtered.length}개</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Table */}
            <div className={`flex-1 overflow-auto ${selected ? 'max-w-[calc(100%-320px)]' : ''}`}>
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                  <p className="text-sm">소재가 없습니다.</p>
                  <button onClick={() => setShowRegister(true)} className="px-4 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">소재 등록하기</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 sticky left-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <input type="checkbox" checked={allChecked} onChange={toggleAllChecked} className="w-3.5 h-3.5 rounded" />
                      </th>
                      {['썸네일','플랫폼','원본 제목','한글 제목','채널','조회수','좋아요'].map((h) => (
                        <th key={h} className="px-2 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">{h}</th>
                      ))}
                      <th className="px-2 py-2.5 border-b border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                          className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider whitespace-nowrap hover:text-blue-600 transition-colors"
                        >
                          등록일
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {sortDir === 'desc'
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />}
                          </svg>
                        </button>
                      </th>
                      {['업로드일','사용여부','예정일','사용일','상태','태그','링크'].map((h) => (
                        <th key={h} className="px-2 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <MatRow key={m.id} mat={m}
                        checked={checked.has(m.id)}
                        onCheck={() => setChecked((prev) => { const s = new Set(prev); s.has(m.id) ? s.delete(m.id) : s.add(m.id); return s })}
                        onSelect={() => setSelected((prev) => prev?.id === m.id ? null : m)}
                        selected={selected?.id === m.id}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="w-80 flex-shrink-0 border-l border-gray-100 dark:border-gray-800">
                <DetailPanel
                  mat={selected}
                  onClose={() => setSelected(null)}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'channel' && (
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">채널 설정 — YouTube 자동 수집 채널 관리</p>
          {channels.length === 0 ? (
            <div className="mt-8 text-center text-gray-400 dark:text-gray-600">
              <p className="text-sm">등록된 채널이 없습니다.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                  {ch.thumbnailUrl && <img src={ch.thumbnailUrl} alt="" className="w-8 h-8 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.channelName}</p>
                    <p className="text-xs text-gray-400">{ch.channelId}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ch.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {ch.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)} onDone={handleMaterialAdded} />
      )}
    </div>
  )
}
