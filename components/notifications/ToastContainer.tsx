'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useNotifications } from './NotificationProvider'

const TYPE_BG: Record<string, string> = {
  task: 'border-l-blue-500',
  schedule: 'border-l-violet-500',
  routine: 'border-l-emerald-500',
  project: 'border-l-rose-500',
}

const TYPE_LABEL: Record<string, string> = {
  task: '할 일', schedule: '일정', routine: '루틴', project: '프로젝트',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const AUTO_DISMISS_MS = 10_000

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const elapsed = Date.now() - latest.shownAt
    const remaining = AUTO_DISMISS_MS - elapsed
    if (remaining <= 0) { dismissToast(latest.id); return }
    const t = setTimeout(() => dismissToast(latest.id), remaining)
    return () => clearTimeout(t)
  }, [toasts, dismissToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
      {toasts.slice(-4).map((toast) => (
        <div
          key={toast.id}
          className={`w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-l-4 ${TYPE_BG[toast.item.type]} rounded-xl shadow-lg flex items-start gap-3 px-4 py-3 animate-in slide-in-from-right-5 duration-300`}
        >
          <span className="text-lg flex-shrink-0 mt-0.5">
            {toast.item.type === 'task' && '✅'}
            {toast.item.type === 'schedule' && '📅'}
            {toast.item.type === 'routine' && '🔄'}
            {toast.item.type === 'project' && '🎯'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
              {TYPE_LABEL[toast.item.type]} 알림
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
              {toast.item.title}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {toast.item.minutesBefore}분 후 · {formatTime(toast.item.dateTime)}
            </p>
            <div className="flex gap-2 mt-2">
              <Link
                href={toast.item.href}
                onClick={() => dismissToast(toast.id)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                보기 →
              </Link>
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
