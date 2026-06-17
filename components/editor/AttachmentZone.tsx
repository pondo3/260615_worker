'use client'

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { getAttachments, type AttachmentItem } from '@/app/actions/attachments'

const MAX_SIZE = 20 * 1024 * 1024
const MAX_FILES = 10

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/'))
    return (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  if (mimeType === 'application/pdf')
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive'))
    return (
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    )
  if (mimeType.includes('word') || mimeType.includes('document'))
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}

export type AttachmentZoneHandle = {
  openFilePicker: () => void
}

type Props = {
  entityType: string
  entityId?: number
  name?: string
  onChange?: (attachments: AttachmentItem[]) => void
}

const AttachmentZone = forwardRef<AttachmentZoneHandle, Props>(function AttachmentZone(
  { entityType, entityId, name = 'attachments', onChange },
  ref
) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    openFilePicker: () => fileInputRef.current?.click(),
  }))

  // Load existing attachments for edit mode
  useEffect(() => {
    if (entityId) {
      getAttachments(entityType, entityId).then(setAttachments)
    }
  }, [entityType, entityId])

  useEffect(() => {
    const done = attachments.filter((a) => !a.uploading)
    onChange?.(done)
  }, [attachments, onChange])

  const uploadFile = useCallback(
    async (file: File) => {
      setError('')
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}"이 20MB를 초과합니다.`)
        return
      }
      const doneCount = attachments.filter((a) => !a.uploading).length
      if (doneCount >= MAX_FILES) {
        setError('첨부파일은 최대 10개까지 가능합니다.')
        return
      }

      const tempId = Math.random().toString(36).slice(2)
      const pending: AttachmentItem = {
        tempId,
        filename: file.name,
        url: '',
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploading: true,
      }
      setAttachments((prev) => [...prev, pending])

      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error || '업로드에 실패했습니다.')
          setAttachments((prev) => prev.filter((a) => a.tempId !== tempId))
          return
        }

        setAttachments((prev) =>
          prev.map((a) =>
            a.tempId === tempId
              ? { ...a, url: data.url, filename: data.filename, size: data.size, mimeType: data.mimeType, uploading: false }
              : a
          )
        )
      } catch {
        setError('업로드 중 오류가 발생했습니다.')
        setAttachments((prev) => prev.filter((a) => a.tempId !== tempId))
      }
    },
    [attachments]
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach(uploadFile)
    },
    [uploadFile]
  )

  const removeAttachment = (att: AttachmentItem) => {
    setAttachments((prev) => prev.filter((a) => a.tempId !== att.tempId))
    // Clean up orphaned blob immediately (not yet saved to DB)
    if (!att.dbId && att.url) {
      fetch(`/api/upload?url=${encodeURIComponent(att.url)}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  const doneAttachments = attachments.filter((a) => !a.uploading)
  const uploadingCount = attachments.filter((a) => a.uploading).length

  return (
    <div className="mt-3">
      {/* Hidden input for FormData integration */}
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          doneAttachments.map((a) => ({
            dbId: a.dbId,
            tempId: a.tempId,
            filename: a.filename,
            url: a.url,
            size: a.size,
            mimeType: a.mimeType,
          }))
        )}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* Drop zone + file list */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
        className={`rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              첨부파일 {doneAttachments.length > 0 ? `(${doneAttachments.length}/10)` : ''}
            </span>
            {uploadingCount > 0 && (
              <span className="text-xs text-blue-500 flex items-center gap-1">
                <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                업로드 중 {uploadingCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            파일 추가
          </button>
        </div>

        {/* File list */}
        {attachments.length === 0 ? (
          <div className="py-5 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1.5">
            <svg className="w-7 h-7 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs">파일을 드래그하거나 파일 추가 버튼을 클릭하세요</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600">파일당 최대 20MB · 최대 10개</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {attachments.map((att) => (
              <div key={att.tempId} className="flex items-center gap-3 px-3 py-2.5">
                {/* Thumbnail for images, icon for others */}
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {att.mimeType.startsWith('image/') && att.url ? (
                    <img src={att.url} alt="" className="w-full h-full object-cover" />
                  ) : att.uploading ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileTypeIcon mimeType={att.mimeType} />
                  )}
                </div>

                {/* Filename + size */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{att.filename}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {att.uploading ? '업로드 중...' : formatBytes(att.size)}
                  </p>
                </div>

                {/* Action buttons */}
                {!att.uploading && att.url && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => window.open(att.url, '_blank')}
                      className="px-2 py-1 text-[10px] font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="새 탭에서 보기"
                    >
                      보기
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadFile(att.url, att.filename)}
                      className="px-2 py-1 text-[10px] font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="다운로드"
                    >
                      다운로드
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})

export default AttachmentZone
