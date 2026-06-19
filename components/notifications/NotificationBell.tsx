'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useNotifications } from './NotificationProvider'

const TYPE_COLOR: Record<string, string> = {
  task: 'text-blue-500',
  schedule: 'text-violet-500',
  routine: 'text-emerald-500',
  project: 'text-rose-500',
}

const TYPE_LABEL: Record<string, string> = {
  task: '할 일', schedule: '일정', routine: '루틴', project: '프로젝트',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now()
}

export default function NotificationBell() {
  const { items, unreadCount, centerOpen, setCenterOpen, markAllRead } = useNotifications()
  const panelRef = useRef<HTMLDivElement>(null)

  const upcoming = items
    .filter((i) => !isPast(i.dateTime))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())

  const past = items
    .filter((i) => isPast(i.dateTime))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 3)

  useEffect(() => {
    if (!centerOpen) return
    markAllRead()
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setCenterOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [centerOpen, markAllRead, setCenterOpen])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setCenterOpen(!centerOpen)}
        title="알림"
        className="relative p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {centerOpen && (
        <div className="absolute left-0 top-9 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-900 dark:text-white">알림</span>
            {items.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">오늘 {items.length}개</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs text-gray-400 dark:text-gray-500">오늘 예정된 알림이 없습니다</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 px-1">예정</p>
                    {upcoming.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setCenterOpen(false)}
                        className="flex items-start gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <span className={`text-sm mt-0.5 flex-shrink-0 ${TYPE_COLOR[item.type]}`}>
                          {item.type === 'task' && '✅'}
                          {item.type === 'schedule' && '📅'}
                          {item.type === 'routine' && '🔄'}
                          {item.type === 'project' && '🎯'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {TYPE_LABEL[item.type]} · {formatTime(item.dateTime)}
                            <span className="ml-1 text-amber-500">({item.minutesBefore}분 전 알림)</span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {past.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 px-1">지난 알림</p>
                    {past.map((item) => (
                      <div key={item.id} className="flex items-start gap-2.5 px-2 py-1.5 opacity-50">
                        <span className="text-sm mt-0.5 flex-shrink-0">
                          {item.type === 'task' && '✅'}
                          {item.type === 'schedule' && '📅'}
                          {item.type === 'routine' && '🔄'}
                          {item.type === 'project' && '🎯'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-through">{item.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(item.dateTime)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
