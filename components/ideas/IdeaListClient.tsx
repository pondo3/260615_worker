'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteIdea, quickAddIdea, toggleIdeaFavorite, updateIdeaStatus,
  convertIdeaToTask, convertIdeaToProject,
} from '@/app/actions/ideas'
import IdeaModal, {
  IdeaItem, STATUS_OPTIONS, IMPORTANCE_OPTIONS, DIFFICULTY_OPTIONS, EFFECT_OPTIONS,
  STATUS_CLS, IMPORTANCE_CLS, getPriorityBadge,
} from './IdeaModal'
import IdeaCategoryManager from './IdeaCategoryManager'

type Idea = {
  id: number
  title: string
  content: string | null
  memo: string | null
  categoryId: number | null
  categoryName: string | null
  categoryColor: string | null
  projectId: number | null
  resourceId: number | null
  status: string
  importance: string
  difficulty: string
  expectedEffect: string
  tags: string[]
  isFavorite: boolean
  dueDate: string | null
  createdAt: string
  updatedAt: string
  relatedLinks: { id: number; title: string; url: string; memo: string | null }[]
}

type Category = { id: number; name: string; color: string; sortOrder: number; _count: { ideas: number } }

type Props = {
  ideas: Idea[]
  categories: Category[]
  projects: { id: number; title: string }[]
  resources: { id: number; title: string }[]
}

const STATUS_BADGE: Record<string, string> = {
  '미정':     'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  '검토 중':   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  '실행 예정': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  '진행 중':   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  '완료':      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  '보류':      'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  '폐기':      'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const IMPORTANCE_BADGE: Record<string, string> = {
  '낮음':     'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  '보통':     'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  '높음':     'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  '매우 중요': 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}
const IMPORTANCE_ORDER: Record<string, number> = { '매우 중요': 0, '높음': 1, '보통': 2, '낮음': 3 }
const STATUS_ORDER: Record<string, number> = { '진행 중': 0, '실행 예정': 1, '검토 중': 2, '미정': 3, '보류': 4, '완료': 5, '폐기': 6 }

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

type SortKey = 'newest' | 'oldest' | 'importance' | 'category' | 'status'

export default function IdeaListClient({ ideas, categories, projects, resources }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showModal, setShowModal] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [editIdea, setEditIdea] = useState<IdeaItem | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterImportance, setFilterImportance] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterEffect, setFilterEffect] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<'card' | 'table'>('table')
  useEffect(() => {
    const s = localStorage.getItem('view_ideas')
    if (s === 'card' || s === 'table') setView(s)
  }, [])
  const changeView = (v: 'card' | 'table') => { setView(v); localStorage.setItem('view_ideas', v) }
  const [quickAddText, setQuickAddText] = useState('')
  const [convertMsg, setConvertMsg] = useState('')

  const total = ideas.length
  const reviewing = ideas.filter((i) => i.status === '검토 중').length
  const inProgress = ideas.filter((i) => i.status === '진행 중').length
  const done = ideas.filter((i) => i.status === '완료').length
  const favorites = ideas.filter((i) => i.isFavorite).length

  const catCount: Record<number, number> = {}
  ideas.forEach((i) => { if (i.categoryId) catCount[i.categoryId] = (catCount[i.categoryId] ?? 0) + 1 })

  const filtered = ideas
    .filter((i) => {
      const q = search.toLowerCase()
      const matchSearch = !q || [i.title, stripHtml(i.content), i.memo, i.categoryName, ...i.tags]
        .some((v) => v?.toLowerCase().includes(q))
      const matchCat = activeCategory === null || i.categoryId === activeCategory
      const matchStatus = !filterStatus || i.status === filterStatus
      const matchImportance = !filterImportance || i.importance === filterImportance
      const matchDifficulty = !filterDifficulty || i.difficulty === filterDifficulty
      const matchEffect = !filterEffect || i.expectedEffect === filterEffect
      return matchSearch && matchCat && matchStatus && matchImportance && matchDifficulty && matchEffect
    })
    .sort((a, b) => {
      if (sortKey === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sortKey === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (sortKey === 'importance') return (IMPORTANCE_ORDER[a.importance] ?? 9) - (IMPORTANCE_ORDER[b.importance] ?? 9)
      if (sortKey === 'category') return (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'ko')
      if (sortKey === 'status') return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return 0
    })

  function openAdd() { setEditIdea(null); setShowModal(true) }
  function openEdit(i: Idea) {
    setEditIdea({
      id: i.id, title: i.title, content: i.content, memo: i.memo,
      categoryId: i.categoryId, projectId: i.projectId, resourceId: i.resourceId,
      status: i.status, importance: i.importance, difficulty: i.difficulty, expectedEffect: i.expectedEffect,
      tags: i.tags, isFavorite: i.isFavorite, dueDate: i.dueDate, relatedLinks: i.relatedLinks,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditIdea(null); router.refresh() }

  function handleDelete(id: number) {
    setDeleteId(null)
    setDetailId(null)
    startTransition(async () => { await deleteIdea(id); router.refresh() })
  }
  function handleToggleFavorite(i: Idea) {
    startTransition(async () => { await toggleIdeaFavorite(i.id, i.isFavorite); router.refresh() })
  }
  function handleQuickAdd() {
    const text = quickAddText.trim()
    if (!text) return
    setQuickAddText('')
    startTransition(async () => { await quickAddIdea(text); router.refresh() })
  }
  function handleStatusChange(id: number, status: string) {
    startTransition(async () => { await updateIdeaStatus(id, status); router.refresh() })
  }
  function handleConvertToTask(id: number) {
    startTransition(async () => {
      const result = await convertIdeaToTask(id)
      setConvertMsg(result && 'success' in result ? '할 일로 전환되었습니다.' : (result?.error ?? '전환에 실패했습니다.'))
      router.refresh()
    })
  }
  function handleConvertToProject(id: number) {
    startTransition(async () => {
      const result = await convertIdeaToProject(id)
      setConvertMsg(result && 'success' in result ? '프로젝트로 전환되었습니다.' : (result?.error ?? '전환에 실패했습니다.'))
      router.refresh()
    })
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'))
  const modalCats = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))
  const detailIdea = ideas.find((i) => i.id === detailId) ?? null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── 헤더 ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">아이디어 관리</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                떠오른 아이디어와 나중에 할 것들을 모아두고, 할 일이나 프로젝트로 전환해보세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCatManager(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                카테고리 관리
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                아이디어 등록
              </button>
            </div>
          </div>

          {/* 빠른 등록 */}
          <div className="flex items-center gap-2 mb-4">
            <input
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
              placeholder="떠오른 생각을 빠르게 입력하세요..."
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors"
            />
            <button
              onClick={handleQuickAdd}
              disabled={!quickAddText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              빠른 추가
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {[
              { label: '전체', value: total, color: 'text-gray-800 dark:text-gray-200' },
              { label: '검토 중', value: reviewing, color: 'text-blue-600 dark:text-blue-400' },
              { label: '진행 중', value: inProgress, color: 'text-amber-600 dark:text-amber-400' },
              { label: '완료', value: done, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: '즐겨찾기', value: favorites, color: 'text-amber-500 dark:text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 text-center">
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 카테고리 탭 ── */}
        <div className="px-4 flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-none">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === null
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            전체
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === null ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              {total}
            </span>
          </button>
          {sortedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat.id ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                {catCount[cat.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-3">
        {/* 검색 + 정렬 + 뷰 토글 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목, 내용, 메모, 태그 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-600 dark:text-gray-400 outline-none focus:border-indigo-400">
            <option value="newest">최신 등록순</option>
            <option value="oldest">오래된 등록순</option>
            <option value="importance">중요도 높은순</option>
            <option value="category">카테고리순</option>
            <option value="status">상태순</option>
          </select>
          <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {(['card', 'table'] as const).map((v) => (
              <button key={v} onClick={() => changeView(v)}
                className={`px-3 py-2.5 transition-colors ${view === v ? 'bg-indigo-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {v === 'card' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: '전체 상태', value: filterStatus, setter: setFilterStatus, options: STATUS_OPTIONS },
            { label: '전체 중요도', value: filterImportance, setter: setFilterImportance, options: IMPORTANCE_OPTIONS },
            { label: '전체 난이도', value: filterDifficulty, setter: setFilterDifficulty, options: DIFFICULTY_OPTIONS },
            { label: '전체 효과', value: filterEffect, setter: setFilterEffect, options: EFFECT_OPTIONS },
          ].map((f) => (
            <select key={f.label} value={f.value} onChange={(e) => f.setter(e.target.value)}
              className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 outline-none focus:border-indigo-400">
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {(search || filterStatus || filterImportance || filterDifficulty || filterEffect) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterImportance(''); setFilterDifficulty(''); setFilterEffect('') }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              필터 초기화
            </button>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{filtered.length}개</span>
        </div>

        {/* ── 카드 뷰 ── */}
        {view === 'card' && (
          <div>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                {ideas.length === 0 ? '아이디어를 등록해보세요.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((i) => {
                  const badge = getPriorityBadge(i.difficulty, i.expectedEffect)
                  const preview = stripHtml(i.content) || i.memo || ''
                  return (
                    <div key={i.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        {i.categoryName && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: i.categoryColor ?? '#6B7280' }}>
                            {i.categoryName}
                          </span>
                        )}
                        <button onClick={() => handleToggleFavorite(i)}
                          className={`p-1 rounded-lg transition-colors ml-auto ${i.isFavorite ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}>
                          <svg className="w-3.5 h-3.5" fill={i.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </div>

                      <button onClick={() => setDetailId(i.id)} className="text-left w-full">
                        <p className="font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-sm line-clamp-2 leading-snug mb-1">
                          {i.title}
                        </p>
                      </button>

                      {preview && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{preview}</p>}

                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[i.status] ?? ''}`}>{i.status}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${IMPORTANCE_BADGE[i.importance] ?? ''}`}>{i.importance}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                      </div>

                      {i.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {i.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] rounded font-medium">
                              #{tag}
                            </span>
                          ))}
                          {i.tags.length > 4 && <span className="text-[10px] text-gray-400">+{i.tags.length - 4}</span>}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{i.dueDate ? `예정 ${i.dueDate}` : i.createdAt}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setDetailId(i.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => openEdit(i)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setDeleteId(i.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 테이블 뷰 ── */}
        {view === 'table' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                {ideas.length === 0 ? '아이디어를 등록해보세요.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['제목', '카테고리', '상태', '중요도', '난이도', '효과', '예정일', ''].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                        <td className="px-3 py-2 max-w-[220px]">
                          <button onClick={() => setDetailId(i.id)} className="flex items-center gap-1.5 text-left">
                            <span className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block max-w-[180px]" title={i.title}>
                              {i.title}
                            </span>
                            {i.isFavorite && (
                              <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                          {i.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {i.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[9px] px-1 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded">#{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {i.categoryName ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: i.categoryColor ?? '#6B7280' }}>
                              {i.categoryName}
                            </span>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <select value={i.status} onChange={(e) => handleStatusChange(i.id, e.target.value)}
                            className={`text-xs font-semibold rounded-lg px-2 py-0.5 outline-none border-0 ${STATUS_BADGE[i.status] ?? ''}`}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${IMPORTANCE_BADGE[i.importance] ?? ''}`}>{i.importance}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{i.difficulty}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{i.expectedEffect}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">{i.dueDate ?? '—'}</td>
                        <td className="pr-3 py-2">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(i)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDeleteId(i.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 삭제 확인 */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">아이디어 삭제</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">이 아이디어를 삭제하시겠어요? 되돌릴 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                취소
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세보기 패널 */}
      {detailIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailId(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 flex-shrink-0 rounded-t-2xl bg-indigo-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">아이디어 상세</h2>
              <button onClick={() => setDetailId(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{detailIdea.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {detailIdea.categoryName && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: detailIdea.categoryColor ?? '#6B7280' }}>
                      {detailIdea.categoryName}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_BADGE[detailIdea.status] ?? ''}`}>{detailIdea.status}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${IMPORTANCE_BADGE[detailIdea.importance] ?? ''}`}>중요도 {detailIdea.importance}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">난이도 {detailIdea.difficulty}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">효과 {detailIdea.expectedEffect}</span>
                  {(() => {
                    const b = getPriorityBadge(detailIdea.difficulty, detailIdea.expectedEffect)
                    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b.cls}`}>{b.label}</span>
                  })()}
                </div>
              </div>

              {detailIdea.content && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: detailIdea.content }}
                />
              )}

              {detailIdea.memo && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">메모</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{detailIdea.memo}</p>
                </div>
              )}

              {detailIdea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailIdea.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-lg font-medium">#{tag}</span>
                  ))}
                </div>
              )}

              {detailIdea.relatedLinks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">관련 링크</p>
                  <div className="space-y-1.5">
                    {detailIdea.relatedLinks.map((link) => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2.5 py-1.5 transition-colors">
                        <svg className="w-3 h-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="flex-1 truncate text-gray-600 dark:text-gray-300 font-medium">{link.title}</span>
                        {link.memo && <span className="truncate max-w-[100px] text-gray-400 dark:text-gray-500">{link.memo}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 dark:text-gray-500">
                {detailIdea.dueDate && <p>예정일: {detailIdea.dueDate}</p>}
                <p>등록일: {detailIdea.createdAt}</p>
              </div>

              {convertMsg && <p className="text-xs text-indigo-600 dark:text-indigo-400">{convertMsg}</p>}
            </div>

            <div className="px-6 pb-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <button onClick={() => handleConvertToTask(detailIdea.id)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
                  할 일로 전환
                </button>
                <button onClick={() => handleConvertToProject(detailIdea.id)}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500 text-sm font-bold text-white hover:bg-violet-600 transition-colors">
                  프로젝트로 전환
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDetailId(null); openEdit(ideas.find((x) => x.id === detailIdea.id)!) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  수정
                </button>
                <button onClick={() => setDeleteId(detailIdea.id)}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 관리 */}
      {showCatManager && (
        <IdeaCategoryManager
          onClose={() => { setShowCatManager(false); router.refresh() }}
          categories={categories.map((c) => ({ ...c }))}
        />
      )}

      {/* 아이디어 등록/수정 */}
      {showModal && (
        <IdeaModal
          onClose={closeModal}
          idea={editIdea ?? undefined}
          categories={modalCats}
          projects={projects}
          resources={resources}
        />
      )}
    </div>
  )
}
