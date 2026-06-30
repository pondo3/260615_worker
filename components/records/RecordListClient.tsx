'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRecord } from '@/app/actions/records'
import RecordModal, { type RecordForEdit } from './RecordModal'
import PageHeader from '@/components/ui/PageHeader'

type VideoLink = {
  id?: number
  url: string
  title: string | null
  thumbnailUrl: string | null
  channelName: string | null
  duration: string | null
  memo: string | null
  sortOrder: number
}

type RecordItem = {
  id: number
  title: string
  date: string
  type: string
  content: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  videoLinks: VideoLink[]
}

const ALL_TYPES = ['전체', '일기', '업무 기록', '영상 기록', '아이디어', '기타'] as const

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  '일기':     { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800' },
  '업무 기록': { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  '영상 기록': { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      border: 'border-red-200 dark:border-red-800' },
  '아이디어':  { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  border: 'border-amber-200 dark:border-amber-800' },
  '기타':     { bg: 'bg-gray-100 dark:bg-gray-700',        text: 'text-gray-600 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-600' },
}

function getTypeStyle(type: string) {
  return TYPE_STYLE[type] ?? TYPE_STYLE['기타']
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractYtId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

function formatMonthKey(ym: string): string {
  const [year, month] = ym.split('-')
  return `${year}년 ${parseInt(month)}월`
}

function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${parseInt(month)}.${parseInt(day)}`
}

function TypeBadge({ type }: { type: string }) {
  const s = getTypeStyle(type)
  return (
    <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {type}
    </span>
  )
}

function VideoCard({ link }: { link: VideoLink }) {
  const ytId = extractYtId(link.url)
  const thumb = link.thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null)
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
      {thumb ? (
        <img src={thumb} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <div className="w-20 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{link.title || link.url}</p>
        {link.channelName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{link.channelName}</p>}
        {link.memo && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 italic">{link.memo}</p>}
      </div>
      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

export default function RecordListClient({ records }: { records: RecordItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('전체')
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordForEdit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [view, setView] = useState<'list' | 'card'>('list')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('view_records')
    if (s === 'card' || s === 'list') setView(s)
  }, [])
  const changeView = (v: 'list' | 'card') => { setView(v); localStorage.setItem('view_records', v) }

  useEffect(() => {
    setSelectedRecord((prev) => {
      if (!prev) return null
      return records.find((r) => r.id === prev.id) ?? null
    })
  }, [records])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showModal) setSelectedRecord(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showModal])

  const filtered = records.filter((r) => {
    const matchType = typeFilter === '전체' || r.type === typeFilter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      (r.content ?? '').toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
    return matchType && matchSearch
  })

  const grouped = filtered.reduce((acc, r) => {
    const key = r.date.slice(0, 7)
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {} as Record<string, RecordItem[]>)
  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const handleDeleteById = async (id: number, title: string) => {
    if (!confirm(`"${title}" 기록을 삭제할까요?`)) return
    setIsDeleting(true)
    const result = await deleteRecord(id)
    setIsDeleting(false)
    if (result.success) {
      if (selectedRecord?.id === id) setSelectedRecord(null)
      router.refresh()
    }
  }

  const handleEditById = (r: RecordItem) => {
    setEditingRecord({ id: r.id, title: r.title, date: r.date, type: r.type, content: r.content, tags: r.tags, videoLinks: r.videoLinks })
    setShowModal(true)
  }

  const handleCloseModal = () => { setShowModal(false); setEditingRecord(null) }

  const handleCopy = async (r: RecordItem) => {
    const text = [r.title, r.content ? stripHtml(r.content) : ''].filter(Boolean).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col p-8">
      <PageHeader
        title="나의 기록"
        description="일기, 업무 기록, 영상 기록 등 일상을 기록합니다"
        accent="amber"
        stats={[
          { label: '전체', value: records.length },
          { label: '이번 달', value: records.filter((r) => r.date >= new Date().toISOString().slice(0, 7)).length },
        ]}
        actions={
          <>
            <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-1">
              <button onClick={() => changeView('list')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="리스트 뷰">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => changeView('card')}
                className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="카드 뷰">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => { setEditingRecord(null); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-colors shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              기록 추가
            </button>
          </>
        }
      />

      {/* Search + Type Filter */}
      <div className="space-y-2 mb-4 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 내용, 태그 검색..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === t ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-sm font-medium">
                {records.length === 0 ? '아직 기록이 없습니다. 첫 기록을 남겨보세요!' : '검색 결과가 없습니다'}
              </p>
            </div>
          ) : view === 'list' ? (
            /* ─── LIST VIEW (날짜 그룹 피드) ─── */
            <div className="space-y-4">
              {groupKeys.map((monthKey) => (
                <div key={monthKey}>
                  {/* 월 구분선 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatMonthKey(monthKey)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{grouped[monthKey].length}개</span>
                  </div>
                  {/* 해당 월 기록 목록 */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {grouped[monthKey].map((r, idx) => {
                      const isSelected = selectedRecord?.id === r.id
                      const preview = r.content ? stripHtml(r.content).trim() : null
                      const s = getTypeStyle(r.type)
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRecord(isSelected ? null : r)}
                          className={`w-full text-left px-4 py-3.5 transition-colors relative ${
                            idx !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                          } ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-900/10'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          {/* 선택 시 왼쪽 강조선 */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 rounded-l-2xl" />
                          )}
                          {/* 헤더 행: 유형 배지 + 제목 + 날짜 */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`flex-shrink-0 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${s.bg} ${s.text} ${s.border}`}>
                              {r.type}
                            </span>
                            <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {r.title}
                            </span>
                            <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {formatDateShort(r.date)}
                            </span>
                          </div>
                          {/* 본문 2줄 요약 */}
                          {preview && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-1.5">
                              {preview}
                            </p>
                          )}
                          {/* 태그 + 영상 */}
                          {(r.tags.length > 0 || r.videoLinks.length > 0) && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {r.tags.slice(0, 5).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium">
                                  #{tag}
                                </span>
                              ))}
                              {r.tags.length > 5 && <span className="text-[10px] text-gray-400">+{r.tags.length - 5}</span>}
                              {r.videoLinks.length > 0 && (
                                <span className="ml-auto flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400 font-semibold">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  영상 {r.videoLinks.length}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ─── CARD VIEW ─── */
            <div className={`grid gap-3 ${
              selectedRecord ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
            }`}>
              {filtered.map((r) => {
                const isSelected = selectedRecord?.id === r.id
                return (
                  <button key={r.id} onClick={() => setSelectedRecord(isSelected ? null : r)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/10 shadow-md ring-1 ring-amber-400/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                    }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <TypeBadge type={r.type} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{r.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-snug">{r.title}</p>
                    {r.content && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-2 leading-relaxed">{stripHtml(r.content)}</p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                          #{tag}
                        </span>
                      ))}
                      {r.tags.length > 3 && <span className="text-[10px] text-gray-400">+{r.tags.length - 3}</span>}
                      {r.videoLinks.length > 0 && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400 font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          영상 {r.videoLinks.length}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── 상세보기 패널 ─── */}
        {selectedRecord && (
          <div className="w-[340px] xl:w-[420px] 2xl:w-[480px] flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 flex flex-col overflow-hidden shadow-sm">
            {/* 패널 헤더 */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <TypeBadge type={selectedRecord.type} />
              <span className="text-xs text-gray-400 dark:text-gray-500">{selectedRecord.date}</span>
              <div className="flex-1" />
              <button onClick={() => handleCopy(selectedRecord)}
                className={`p-1.5 rounded-lg transition-colors ${copied ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                title="복사">
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button onClick={() => handleEditById(selectedRecord)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                title="수정">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleDeleteById(selectedRecord.id, selectedRecord.title)} disabled={isDeleting}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                title="삭제">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="닫기">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{selectedRecord.title}</h2>
              {selectedRecord.content && (
                <div
                  className="record-prose"
                  dangerouslySetInnerHTML={{ __html: selectedRecord.content }}
                />
              )}
              {selectedRecord.videoLinks.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">영상 링크</p>
                  <div className="space-y-2">
                    {selectedRecord.videoLinks.map((v, i) => <VideoCard key={v.id ?? i} link={v} />)}
                  </div>
                </div>
              )}
              {selectedRecord.tags.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">태그</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecord.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-300 dark:text-gray-600 pt-2 border-t border-gray-100 dark:border-gray-800">
                마지막 수정: {new Date(selectedRecord.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}
      </div>

      <RecordModal isOpen={showModal} onClose={handleCloseModal} editingRecord={editingRecord} />
    </div>
  )
}
