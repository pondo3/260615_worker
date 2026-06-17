'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { fetchYoutubeInfo } from '@/app/actions/youtube'
import { createRecord, updateRecord, type VideoLinkInput } from '@/app/actions/records'
import EditorWithAttachments from '@/components/editor/EditorWithAttachments'
import type { AttachmentItem } from '@/app/actions/attachments'

const RECORD_TYPES = ['일기', '업무 기록', '영상 기록', '아이디어', '기타'] as const

type VideoLinkDraft = {
  tempId: string
  url: string
  title: string
  thumbnailUrl: string
  channelName: string
  duration: string
  memo: string
  fetchStatus: 'idle' | 'loading' | 'done' | 'error'
}

export type RecordForEdit = {
  id: number
  title: string
  date: string
  type: string
  content: string | null
  tags: string[]
  videoLinks: {
    id?: number
    url: string
    title: string | null
    thumbnailUrl: string | null
    channelName: string | null
    duration: string | null
    memo: string | null
    sortOrder: number
  }[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  editingRecord?: RecordForEdit | null
}

function extractYtId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

function makeTempId() {
  return Math.random().toString(36).slice(2)
}

export default function RecordModal({ isOpen, onClose, editingRecord }: Props) {
  const router = useRouter()
  const isEdit = !!editingRecord

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [type, setType] = useState('일기')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [videoLinks, setVideoLinks] = useState<VideoLinkDraft[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!isOpen) return
    if (editingRecord) {
      setTitle(editingRecord.title)
      setDate(editingRecord.date)
      setType(editingRecord.type)
      setContent(editingRecord.content ?? '')
      setAttachments([])
      setTags(editingRecord.tags)
      setVideoLinks(
        editingRecord.videoLinks.map((v) => ({
          tempId: makeTempId(),
          url: v.url,
          title: v.title ?? '',
          thumbnailUrl: v.thumbnailUrl ?? '',
          channelName: v.channelName ?? '',
          duration: v.duration ?? '',
          memo: v.memo ?? '',
          fetchStatus: v.title ? 'done' : 'idle',
        }))
      )
    } else {
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setType('일기')
      setContent('')
      setAttachments([])
      setTagInput('')
      setTags([])
      setVideoLinks([])
    }
    setError('')
  }, [isOpen, editingRecord])

  const handleUrlChange = useCallback((tempId: string, url: string) => {
    setVideoLinks((prev) => prev.map((v) => v.tempId === tempId ? { ...v, url, fetchStatus: 'idle' } : v))

    if (debounceRefs.current[tempId]) clearTimeout(debounceRefs.current[tempId])
    const ytId = extractYtId(url)
    if (!ytId) return

    debounceRefs.current[tempId] = setTimeout(async () => {
      setVideoLinks((prev) => prev.map((v) => v.tempId === tempId ? { ...v, fetchStatus: 'loading' } : v))
      try {
        const result = await fetchYoutubeInfo(ytId)
        setVideoLinks((prev) =>
          prev.map((v) =>
            v.tempId === tempId
              ? {
                  ...v,
                  title: result.success ? (result.title ?? '') : v.title,
                  thumbnailUrl: result.success ? (result.thumbnailUrl ?? '') : v.thumbnailUrl,
                  channelName: result.success ? (result.channelName ?? '') : v.channelName,
                  duration: result.success ? (result.duration ?? '') : v.duration,
                  fetchStatus: result.success ? 'done' : 'error',
                }
              : v
          )
        )
      } catch {
        setVideoLinks((prev) => prev.map((v) => v.tempId === tempId ? { ...v, fetchStatus: 'error' } : v))
      }
    }, 700)
  }, [])

  const addVideoLink = () =>
    setVideoLinks((prev) => [
      ...prev,
      { tempId: makeTempId(), url: '', title: '', thumbnailUrl: '', channelName: '', duration: '', memo: '', fetchStatus: 'idle' },
    ])

  const removeVideoLink = (tempId: string) => setVideoLinks((prev) => prev.filter((v) => v.tempId !== tempId))

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '').trim()
    if (tag && !tags.includes(tag)) setTags((p) => [...p, tag])
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    else if (e.key === 'Backspace' && !tagInput) setTags((p) => p.slice(0, -1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    setIsSubmitting(true)
    setError('')

    const input = {
      title,
      date,
      type,
      content: content || null,
      attachments,
      tags,
      videoLinks: videoLinks
        .filter((v) => v.url.trim())
        .map<VideoLinkInput>((v) => ({
          url: v.url.trim(),
          title: v.title || null,
          thumbnailUrl: v.thumbnailUrl || null,
          channelName: v.channelName || null,
          duration: v.duration || null,
          memo: v.memo || null,
        })),
    }

    const result = isEdit ? await updateRecord(editingRecord!.id, input) : await createRecord(input)
    setIsSubmitting(false)

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error ?? '오류가 발생했습니다.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? '기록 수정' : '새 기록 추가'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="기록 제목"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Date + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">기록 유형</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">내용</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <EditorWithAttachments
                key={editingRecord?.id ?? 'new'}
                name="content"
                entityType="record"
                entityId={editingRecord?.id}
                defaultValue={editingRecord?.content ?? ''}
                placeholder="기록 내용을 입력하세요..."
                onContentChange={setContent}
                onAttachmentsChange={setAttachments}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">태그</label>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[44px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                    className="hover:text-amber-900 dark:hover:text-amber-200 leading-none"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                placeholder={tags.length === 0 ? 'Enter로 태그 추가' : '추가...'}
                className="flex-1 min-w-16 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Video Links */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">영상 링크</label>
              <button
                type="button"
                onClick={addVideoLink}
                className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                추가
              </button>
            </div>
            <div className="space-y-3">
              {videoLinks.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  추가 버튼을 눌러 영상 링크를 등록하세요
                </p>
              )}
              {videoLinks.map((vl) => (
                <VideoLinkRow
                  key={vl.tempId}
                  draft={vl}
                  onUrlChange={(url) => handleUrlChange(vl.tempId, url)}
                  onMemoChange={(memo) =>
                    setVideoLinks((p) => p.map((v) => v.tempId === vl.tempId ? { ...v, memo } : v))
                  }
                  onRemove={() => removeVideoLink(vl.tempId)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? '저장 중...' : isEdit ? '수정하기' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function VideoLinkRow({
  draft,
  onUrlChange,
  onMemoChange,
  onRemove,
}: {
  draft: VideoLinkDraft
  onUrlChange: (url: string) => void
  onMemoChange: (memo: string) => void
  onRemove: () => void
}) {
  const ytId = extractYtId(draft.url)
  const thumbSrc = draft.thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '')
  const showPreview = (draft.fetchStatus === 'done' || draft.fetchStatus === 'idle') && draft.url && (draft.title || thumbSrc)

  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={draft.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {draft.fetchStatus === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>YouTube 정보를 가져오는 중...</span>
        </div>
      )}

      {showPreview && (
        <div className="flex items-center gap-3">
          {thumbSrc && (
            <img
              src={thumbSrc}
              alt=""
              className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          {draft.title && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{draft.title}</p>
              {draft.channelName && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{draft.channelName}</p>
              )}
            </div>
          )}
        </div>
      )}

      {draft.fetchStatus === 'error' && (
        <p className="text-xs text-red-500 dark:text-red-400">YouTube 정보를 가져오지 못했습니다.</p>
      )}

      <input
        type="text"
        value={draft.memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="메모 (선택)"
        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  )
}
