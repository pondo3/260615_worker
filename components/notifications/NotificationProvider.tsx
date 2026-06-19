'use client'

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react'
import { getUpcomingNotifications, type NotifItem } from '@/app/actions/notifications'

export type Toast = {
  id: string
  item: NotifItem
  shownAt: number
}

type Ctx = {
  items: NotifItem[]
  toasts: Toast[]
  unreadCount: number
  centerOpen: boolean
  setCenterOpen: (v: boolean) => void
  dismissToast: (id: string) => void
  markAllRead: () => void
}

const NotificationContext = createContext<Ctx>({
  items: [], toasts: [], unreadCount: 0,
  centerOpen: false, setCenterOpen: () => {},
  dismissToast: () => {}, markAllRead: () => {},
})

export function useNotifications() { return useContext(NotificationContext) }

const SHOWN_KEY = 'notif-shown-v1'

function loadShownIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    if (!raw) return new Set()
    const { date, ids } = JSON.parse(raw)
    if (date !== new Date().toISOString().split('T')[0]) return new Set()
    return new Set(ids as string[])
  } catch { return new Set() }
}

function saveShownIds(ids: Set<string>) {
  localStorage.setItem(SHOWN_KEY, JSON.stringify({
    date: new Date().toISOString().split('T')[0],
    ids: [...ids],
  }))
}

const TYPE_ICON: Record<string, string> = {
  task: '✅', schedule: '📅', routine: '🔄', project: '🎯',
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotifItem[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [centerOpen, setCenterOpen] = useState(false)
  const shownRef = useRef<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const triggerNotification = useCallback((item: NotifItem) => {
    if (shownRef.current.has(item.id)) return
    shownRef.current.add(item.id)
    saveShownIds(shownRef.current)

    setToasts((prev) => [...prev, { id: item.id, item, shownAt: Date.now() }])
    setUnreadCount((n) => n + 1)

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const eventTime = new Date(item.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      new Notification(`${TYPE_ICON[item.type]} ${item.title}`, {
        body: `${item.minutesBefore}분 후 (${eventTime})`,
        icon: '/favicon.ico',
        tag: item.id,
      })
    }
  }, [])

  const scheduleTimers = useCallback((notifItems: NotifItem[]) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current.clear()

    const now = Date.now()
    for (const item of notifItems) {
      const alertMs = new Date(item.dateTime).getTime() - item.minutesBefore * 60_000
      const delay = alertMs - now

      if (delay > 0 && delay < 24 * 3600_000) {
        const t = setTimeout(() => triggerNotification(item), delay)
        timersRef.current.set(item.id, t)
      } else if (delay <= 0 && delay > -(item.minutesBefore + 5) * 60_000) {
        // 방금 지났거나 창 열었을 때 이미 알림 시간인 경우
        triggerNotification(item)
      }
    }
  }, [triggerNotification])

  const refresh = useCallback(async () => {
    try {
      const data = await getUpcomingNotifications()
      setItems(data)
      scheduleTimers(data)
    } catch { /* silent */ }
  }, [scheduleTimers])

  useEffect(() => {
    shownRef.current = loadShownIds()

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    refresh()
    const interval = setInterval(refresh, 5 * 60_000)
    return () => {
      clearInterval(interval)
      timersRef.current.forEach(clearTimeout)
    }
  }, [refresh])

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function markAllRead() {
    setUnreadCount(0)
  }

  return (
    <NotificationContext.Provider value={{ items, toasts, unreadCount, centerOpen, setCenterOpen, dismissToast, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}
