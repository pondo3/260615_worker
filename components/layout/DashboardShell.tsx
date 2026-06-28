'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { NotificationProvider } from '@/components/notifications/NotificationProvider'
import NotificationBell from '@/components/notifications/NotificationBell'
import ToastContainer from '@/components/notifications/ToastContainer'

const FAVORITES_KEY = 'nav-favorites'
const FAVORITES_OPEN_KEY = 'nav-favorites-open'

type User = { name: string; email: string }

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  ready?: boolean
}

type StageGroup = {
  stage: 1 | 2 | 3 | 4
  label: string
  color: string          // tailwind bg class for the dot/badge
  textColor: string      // tailwind text class
  borderColor: string
  items: NavItem[]
  defaultOpen: boolean
}

/* ─── 아이콘 모음 ─── */
const Icons = {
  dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  today: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" /></svg>,
  tomorrow: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 13l2 2 2-2" /></svg>,
  tasks: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  done: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  onhold: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  goals: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  projects: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  ideas: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 18h6m-5 3h4M12 3a6 6 0 00-6 6c0 1.887.926 3.61 2.4 4.65.5.354.6.59.6 1.35h6c0-.76.1-.996.6-1.35A6.001 6.001 0 0018 9a6 6 0 00-6-6z" /></svg>,
  routines: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  schedules: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  tests: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
  resources: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  materials: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  time: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.8} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v5l3 3" /></svg>,
  analysis: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>,
  report: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  compare: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
  auto: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  journal: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  ai: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  apiSettings: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  launcher: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  processes: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
}

const stageGroups: StageGroup[] = [
  {
    stage: 1,
    label: '핵심 관리',
    color: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-900',
    defaultOpen: true,
    items: [
      { href: '/tasks/today', label: '오늘 할 일', icon: Icons.today, ready: true },
      { href: '/tasks/tomorrow', label: '내일 할 일', icon: Icons.tomorrow, ready: true },
      { href: '/tasks', label: '전체 할 일', icon: Icons.tasks, ready: true },
      { href: '/tasks/done', label: '완료한 일', icon: Icons.done, ready: true },
      { href: '/tasks/on-hold', label: '보류한 일', icon: Icons.onhold, ready: true },
      { href: '/goals', label: '목표 관리', icon: Icons.goals, ready: true },
      { href: '/projects', label: '프로젝트 관리', icon: Icons.projects, ready: true },
      { href: '/ideas', label: '아이디어 관리', icon: Icons.ideas, ready: true },
    ],
  },
  {
    stage: 2,
    label: '루틴·일정·테스트',
    color: 'bg-violet-500',
    textColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200 dark:border-violet-900',
    defaultOpen: false,
    items: [
      { href: '/routines', label: '루틴 관리', icon: Icons.routines, ready: true },
      { href: '/schedules', label: '일정 관리', icon: Icons.schedules, ready: true },
      { href: '/tests', label: '테스트 관리', icon: Icons.tests, ready: true },
      { href: '/resources', label: '자료 보관함', icon: Icons.resources, ready: true },
      { href: '/materials', label: '소재 탐색', icon: Icons.materials, ready: true },
      { href: '/processes', label: '프로세스 관리', icon: Icons.processes, ready: true },
      { href: '/launcher', label: '업무 런처', icon: Icons.launcher, ready: true },
    ],
  },
  {
    stage: 3,
    label: '기록 & 분석',
    color: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-900',
    defaultOpen: false,
    items: [
      { href: '/time', label: '시간 관리', icon: Icons.time, ready: true },
      { href: '/records', label: '나의 기록', icon: Icons.journal, ready: true },
      { href: '/analysis', label: '분석', icon: Icons.analysis, ready: true },
      { href: '/reports/monthly', label: '월간 리포트', icon: Icons.report, ready: true },
    ],
  },
  {
    stage: 4,
    label: '고급 기능',
    color: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-900',
    defaultOpen: false,
    items: [
      { href: '/reports/compare', label: '테스트 비교 분석', icon: Icons.compare, ready: true },
      { href: '/reports/auto', label: '자동 리포트', icon: Icons.auto, ready: true },
      { href: '/ai', label: 'AI 분석', icon: Icons.ai },
      { href: '/settings/api', label: 'API 키 관리', icon: Icons.apiSettings, ready: true },
    ],
  },
]

/* ─── NavItem ─── */
function NavItemEl({ item, collapsed, stageColor, favorited, onToggleFavorite }: {
  item: NavItem
  collapsed: boolean
  stageColor: string
  favorited?: boolean
  onToggleFavorite?: (href: string) => void
}) {
  const pathname = usePathname()
  const active = pathname === item.href || (item.href !== '/dashboard' && item.href.length > 1 && pathname.startsWith(item.href + '/'))

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative ${
        active
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      <span className={`flex-shrink-0 transition-colors ${
        active ? stageColor.replace('bg-', 'text-') : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
      }`}>
        {item.icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {!item.ready && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-semibold flex-shrink-0">
              준비중
            </span>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.href) }}
              className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                favorited ? 'opacity-100 text-amber-400 hover:text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
              }`}
              title={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <svg className="w-3.5 h-3.5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
        </>
      )}
      {active && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${stageColor}`} />}
    </Link>
  )
}

/* ─── 접이식 그룹 ─── */
function StageGroupEl({ group, collapsed, open, onToggle, favorites, onToggleFavorite }: {
  group: StageGroup
  collapsed: boolean
  open: boolean
  onToggle: () => void
  favorites: string[]
  onToggleFavorite: (href: string) => void
}) {
  if (collapsed) {
    return (
      <div className="py-1">
        <div className={`mx-auto w-5 h-px ${group.color.replace('bg-', 'bg-').replace('500', '200')} dark:opacity-30 my-1`} />
        {group.items.map((item) => (
          <NavItemEl key={item.href} item={item} collapsed={true} stageColor={group.color} />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      {/* 그룹 헤더 */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors group hover:bg-gray-50 dark:hover:bg-gray-800/60`}
      >
        <span className={`flex-shrink-0 w-5 h-5 rounded-md ${group.color} flex items-center justify-center text-white text-[10px] font-black`}>
          {group.stage}
        </span>
        <span className="flex-1 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
          {group.label}
        </span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 아이템 목록 */}
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pl-2 pt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavItemEl
              key={item.href}
              item={item}
              collapsed={false}
              stageColor={group.color}
              favorited={favorites.includes(item.href)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── 테마 토글 ─── */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {theme === 'dark' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

/* ─── 메인 컴포넌트 ─── */
export default function DashboardShell({ user, logoutAction, children }: {
  user: User
  logoutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>(
    Object.fromEntries(stageGroups.map((g) => [g.stage, g.defaultOpen]))
  )
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [favEditMode, setFavEditMode] = useState(false)
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const pathname = usePathname()

  // ── 네비게이션 진행 바 ──
  const [navActive, setNavActive] = useState(false)
  const [navComplete, setNavComplete] = useState(false)
  const navTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const navStartPath = useRef<string | null>(null)

  const startNav = useCallback(() => {
    navTimers.current.forEach(clearTimeout)
    navTimers.current = []
    navStartPath.current = pathname
    setNavComplete(false)
    setNavActive(true)
  }, [pathname])

  useEffect(() => {
    if (navActive && navStartPath.current !== null && pathname !== navStartPath.current) {
      setNavComplete(true)
      navStartPath.current = null
      navTimers.current.push(
        setTimeout(() => { setNavActive(false); setNavComplete(false) }, 450)
      )
    }
  }, [pathname, navActive])

  // localStorage에서 즐겨찾기 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (saved) {
      try { setFavorites(JSON.parse(saved)) } catch { /* ignore */ }
    }
    const open = localStorage.getItem(FAVORITES_OPEN_KEY)
    if (open !== null) setFavoritesOpen(open !== 'false')
  }, [])

  function toggleFavorite(href: string) {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      if (next.length === 0) setFavEditMode(false)
      return next
    })
  }

  function handleDragStart(idx: number) {
    setDragSrcIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    if (dragSrcIdx === null || dragSrcIdx === idx) {
      setDragSrcIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...favorites]
    const [moved] = next.splice(dragSrcIdx, 1)
    next.splice(idx, 0, moved)
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    setDragSrcIdx(null)
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    setDragSrcIdx(null)
    setDragOverIdx(null)
  }

  function toggleFavoritesOpen() {
    setFavoritesOpen((prev) => {
      localStorage.setItem(FAVORITES_OPEN_KEY, String(!prev))
      return !prev
    })
  }

  function toggleGroup(stage: number) {
    setOpenGroups((prev) => ({ ...prev, [stage]: !prev[stage] }))
  }

  // 활성 메뉴가 속한 그룹 자동 열기
  useEffect(() => {
    const activeStage = stageGroups.find((g) =>
      g.items.some((i) => pathname === i.href || (i.href.length > 1 && pathname.startsWith(i.href + '/')))
    )?.stage
    if (activeStage) {
      setOpenGroups((prev) => prev[activeStage] ? prev : { ...prev, [activeStage]: true })
    }
  }, [pathname])

  // 즐겨찾기 아이템 조합 (모든 그룹에서 href 매칭)
  const allItems = stageGroups.flatMap((g) => g.items.map((item) => ({ ...item, stageColor: g.color })))
  const favoriteItems = favorites
    .map((href) => allItems.find((i) => i.href === href))
    .filter(Boolean) as (NavItem & { stageColor: string })[]

  return (
    <NotificationProvider>
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">

      {/* ── 네비게이션 진행 바 ── */}
      {navActive && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500 rounded-full"
            style={{
              width: navComplete ? '100%' : '72%',
              transition: navComplete
                ? 'width 150ms ease-in, opacity 300ms ease 150ms'
                : 'width 1800ms cubic-bezier(0.1, 0.5, 0.3, 1)',
              opacity: navComplete ? 0 : 1,
            }}
          />
        </div>
      )}

      {/* ── 사이드바 ── */}
      <aside
        onClick={(e) => {
          const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
          if (anchor) startNav()
        }}
        className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col fixed top-0 left-0 h-screen z-20 shadow-sm transition-all duration-200`}
      >

        {/* 로고 + 컨트롤 */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-black mx-auto hover:bg-blue-700 transition-colors"
              title="메뉴 펼치기"
            >W</button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">W</div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">Work Manager</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">개인 업무 관리</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <NotificationBell />
                <ThemeToggle />
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="메뉴 접기"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
          {/* 대시보드 */}
          <NavItemEl
            item={{ href: '/dashboard', label: '대시보드', icon: Icons.dashboard, ready: true }}
            collapsed={collapsed}
            stageColor="bg-gray-500"
          />

          {/* 즐겨찾기 섹션 */}
          {!collapsed && (
            <div className="mb-1">
              {/* 헤더: 토글 + 편집 버튼 */}
              <div className="flex items-center">
                <button
                  onClick={toggleFavoritesOpen}
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="flex-1 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    즐겨찾기
                  </span>
                  <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 ${favoritesOpen ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${favoritesOpen ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
                {favoritesOpen && favoriteItems.length > 0 && (
                  <button
                    onClick={() => setFavEditMode((v) => !v)}
                    className={`mr-1 px-2 py-1 text-[10px] font-bold rounded-lg transition-colors flex-shrink-0 ${
                      favEditMode
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {favEditMode ? '완료' : '편집'}
                  </button>
                )}
              </div>

              <div className={`overflow-hidden transition-all duration-200 ${favoritesOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pl-2 pt-0.5 space-y-0.5">
                  {favoriteItems.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-600 italic">
                      메뉴에서 ★을 눌러 추가하세요
                    </p>
                  ) : favEditMode ? (
                    // 편집 모드: 드래그앤드롭
                    favoriteItems.map((item, idx) => (
                      <div
                        key={item.href}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-2 py-2 rounded-xl select-none transition-all ${
                          dragSrcIdx === idx ? 'opacity-30' : 'opacity-100'
                        } ${
                          dragOverIdx === idx && dragSrcIdx !== idx
                            ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300 dark:ring-amber-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                        style={{ cursor: 'grab' }}
                      >
                        {/* 드래그 핸들 */}
                        <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="7" cy="4" r="1.5" /><circle cx="13" cy="4" r="1.5" />
                            <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
                            <circle cx="7" cy="16" r="1.5" /><circle cx="13" cy="16" r="1.5" />
                          </svg>
                        </span>
                        <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">{item.icon}</span>
                        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
                        {/* 즐겨찾기 해제 */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.href) }}
                          className="flex-shrink-0 p-0.5 rounded text-amber-400 hover:text-gray-300 dark:hover:text-gray-600 transition-colors"
                          title="즐겨찾기 해제"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    // 일반 모드
                    favoriteItems.map((item) => (
                      <NavItemEl
                        key={item.href}
                        item={item}
                        collapsed={false}
                        stageColor={item.stageColor}
                        favorited={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="py-1">
            <div className="border-t border-gray-100 dark:border-gray-800" />
          </div>

          {/* 단계별 그룹 — 즐겨찾기가 열려 있고 아이템이 있으면 숨김 */}
          {(!favoritesOpen || favoriteItems.length === 0 || collapsed) && stageGroups.map((group) => (
            <StageGroupEl
              key={group.stage}
              group={group}
              collapsed={collapsed}
              open={openGroups[group.stage] ?? false}
              onToggle={() => toggleGroup(group.stage)}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </nav>

        {/* 유저 영역 */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex-shrink-0">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <ThemeToggle />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                {user.name[0]}
              </div>
              <form action={logoutAction}>
                <button type="submit" title="로그아웃"
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} min-h-screen transition-all duration-200 bg-gray-50 dark:bg-gray-950`}>
        {children}
      </main>
    </div>
    <ToastContainer />
    </NotificationProvider>
  )
}
