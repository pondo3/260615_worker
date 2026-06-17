'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteRecord } from '@/app/actions/records'
import RecordModal, { type RecordForEdit } from './RecordModal'

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
  '일기':    { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400',   border: 'border-blue-200 dark:border-blue-800' },
  '업무 기록': { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  '영상 기록': { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',     border: 'border-red-200 dark:border-red-800' },
  '아이디어':  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400',  border: 'border-amber-200 dark:border-amber-800' },
  '기타':    { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300',   border: 'border-gray-200 dark:border-gray-600' },
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
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-20 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
          {link.title || link.url}
        </p>
        {link.channelName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{link.channelName}</p>
        )}
        {link.memo && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5 italic">{link.memo}</p>
        )}
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

  // Keep selected record in sync after router.refresh()
  useEffect(() => {
    setSelectedRecord((prev) => {
      if (!prev) return null
      return records.find((r) => r.id === prev.id) ?? null
    })
  }, [records])

  // Escape key closes the detail panel
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

  const handleDelete = async () => {
    if (!selectedRecord || isDeleting) return
    if (!confirm(`"${selectedRecord.title}" 기록을 삭제할까요?`)) return
    setIsDeleting(true)
    const result = await deleteRecord(selectedRecord.id)
    setIsDeleting(false)
    if (result.success) {
      setSelectedRecord(null)
      router.refresh()
    }
  }

  const handleEdit = () => {
    if (!selectedRecord) return
    setEditingRecord({
      id: selectedRecord.id,
      title: selectedRecord.title,
      date: selectedRecord.date,
      type: selectedRecord.type,
      content: selectedRecord.content,
      tags: selectedRecord.tags,
      videoLinks: selectedRecord.videoLinks,
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">나의 기록</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">총 {records.length}개의 기록</p>
        </div>
        <button
          onClick={() => { setEditingRecord(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          기록 추가
        </button>
      </div>

      {/* Search + Type Filter */}
      <div className="space-y-2 mb-4 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 내용, 태그 검색..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === t
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main: card grid + detail panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Card Grid */}
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
          ) : (
            <div
              className={`grid gap-3 ${
                selectedRecord
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {filtered.map((r) => {
                const isSelected = selectedRecord?.id === r.id
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecord(isSelected ? null : r)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/10 shadow-md ring-1 ring-amber-400/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <TypeBadge type={r.type} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{r.date}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-snug">
                      {r.title}
                    </p>
                    {r.content && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-2 leading-relaxed">
                        {stripHtml(r.content)}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        >
                          #{tag}
                        </span>
                      ))}
                      {r.tags.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{r.tags.length - 3}</span>
                      )}
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

        {/* Detail Panel */}
        {selectedRecord && (
          <div className="w-80 xl:w-96 flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <TypeBadge type={selectedRecord.type} />
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{selectedRecord.date}</span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                {selectedRecord.title}
              </h2>

              {selectedRecord.content && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                    내용
                  </p>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedRecord.content }}
                  />
                </div>
              )}

              {selectedRecord.videoLinks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                    영상 링크
                  </p>
                  <div className="space-y-2">
                    {selectedRecord.videoLinks.map((v, i) => (
                      <VideoCard key={v.id ?? i} link={v} />
                    ))}
                  </div>
                </div>
              )}

              {selectedRecord.tags.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                    태그
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecord.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-300 dark:text-gray-600 pt-2 border-t border-gray-100 dark:border-gray-700">
                마지막 수정: {new Date(selectedRecord.updatedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>

            {/* Panel Footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                수정
              </button>
            </div>
          </div>
        )}
      </div>

      <RecordModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingRecord={editingRecord}
      />
    </div>
  )
}
