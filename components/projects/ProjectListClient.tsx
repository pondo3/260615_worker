'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/app/actions/projects'
import ProjectModal from './ProjectModal'
import ProjectDetailModal from './ProjectDetailModal'

type Project = {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  startDate: string | null
  endDate: string | null
  color: string
}

type TaskStats = { total: number; done: number; inProgress: number; pending: number }

const TYPE_KO: Record<string, string> = { work: '업무', personal: '개인', study: '학습', other: '기타' }
const STATUS_KO: Record<string, string> = { planning: '계획 중', active: '진행 중', completed: '완료', paused: '중단' }
const STATUS_BADGE: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  paused:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const TYPE_BADGE: Record<string, string> = {
  work:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  personal: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  study:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  other:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function daysLeft(endIso: string | null) {
  if (!endIso) return null
  const end = new Date(endIso)
  end.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

/* ─── 카드 뷰 ─── */
function ProjectCard({ project, stats, onDetail, onEdit, onDelete }: {
  project: Project
  stats: TaskStats
  onDetail: (p: Project) => void
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
}) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  const remaining = daysLeft(project.endDate)
  const isDone = project.status === 'completed'
  const preview = project.description ? stripHtml(project.description) : ''

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all cursor-pointer ${isDone ? 'opacity-75' : ''}`}
      onClick={() => onDetail(project)}
    >
      <div className="h-1" style={{ backgroundColor: project.color }} />
      <div className="p-5">
        {/* 배지 */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[project.type]}`}>
            {TYPE_KO[project.type]}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[project.status]}`}>
            {STATUS_KO[project.status]}
          </span>
          {remaining !== null && !isDone && (
            <span className={`ml-auto text-[10px] font-semibold flex-shrink-0 ${
              remaining < 0 ? 'text-red-500' : remaining <= 7 ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {remaining < 0 ? `${Math.abs(remaining)}일 초과` : remaining === 0 ? 'D-day' : `D-${remaining}`}
            </span>
          )}
        </div>

        {/* 제목 */}
        <h3 className={`text-sm font-bold leading-snug mb-1 ${isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {project.title}
        </h3>
        {preview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
            {preview}
          </p>
        )}

        {/* 진행률 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-400">
              {stats.total > 0 ? `할 일 ${stats.done}/${stats.total}` : '연결 없음'}
            </span>
            <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-500' : pct >= 50 ? 'text-violet-500' : 'text-gray-400'}`}>
              {pct}%
            </span>
          </div>
          {/* 세그먼트 바 */}
          {stats.total > 0 ? (
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 gap-px">
              {stats.done > 0 && (
                <div className="bg-emerald-500 h-full" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
              )}
              {stats.inProgress > 0 && (
                <div className="bg-blue-400 h-full" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} />
              )}
            </div>
          ) : (
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2" />
          )}
        </div>

        {/* 기간 */}
        {(project.startDate || project.endDate) && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-4">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {project.startDate && formatDate(project.startDate)}
            {project.endDate && ` — ${formatDate(project.endDate)}`}
          </div>
        )}

        {/* 액션 */}
        <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(project)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── 리스트 뷰 ─── */
function ProjectRow({ project, stats, onDetail, onEdit, onDelete }: {
  project: Project
  stats: TaskStats
  onDetail: (p: Project) => void
  onEdit: (p: Project) => void
  onDelete: (id: number) => void
}) {
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
  const remaining = daysLeft(project.endDate)
  const isDone = project.status === 'completed'

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isDone ? 'opacity-70' : ''}`}
      onClick={() => onDetail(project)}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {project.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[project.type]}`}>
            {TYPE_KO[project.type]}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[project.status]}`}>
            {STATUS_KO[project.status]}
          </span>
          {project.endDate && (
            <span className="text-[10px] text-gray-400">
              ~ {formatDate(project.endDate)}
            </span>
          )}
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="w-32 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
          {stats.total > 0 && (
            <span className="text-[10px] text-gray-400">{stats.done}/{stats.total}</span>
          )}
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden flex gap-px">
          {stats.done > 0 && (
            <div className="bg-emerald-500 h-full" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
          )}
          {stats.inProgress > 0 && (
            <div className="bg-blue-400 h-full" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} />
          )}
        </div>
      </div>

      {/* D-day */}
      {remaining !== null && !isDone ? (
        <span className={`text-xs font-bold w-14 text-right flex-shrink-0 ${
          remaining < 0 ? 'text-red-500' : remaining <= 7 ? 'text-orange-500' : 'text-gray-400'
        }`}>
          {remaining < 0 ? `+${Math.abs(remaining)}일` : remaining === 0 ? 'D-day' : `D-${remaining}`}
        </span>
      ) : (
        <span className="w-14 flex-shrink-0" />
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(project)}
          className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(project.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ─── 메인 ─── */
type FilterKey = 'all' | 'planning' | 'active' | 'work' | 'personal' | 'study' | 'completed' | 'paused'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: '전체' },
  { key: 'active',   label: '진행 중' },
  { key: 'planning', label: '계획 중' },
  { key: 'work',     label: '업무' },
  { key: 'personal', label: '개인' },
  { key: 'study',    label: '학습' },
  { key: 'completed',label: '완료' },
  { key: 'paused',   label: '중단' },
]

export default function ProjectListClient({
  projects,
  progressMap,
}: {
  projects: Project[]
  progressMap: Record<string, TaskStats>
}) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<'card' | 'list'>('list')
  useEffect(() => {
    const s = localStorage.getItem('view_projects')
    if (s === 'card' || s === 'list') setView(s)
  }, [])
  const changeView = (v: 'card' | 'list') => { setView(v); localStorage.setItem('view_projects', v) }
  const [showAdd, setShowAdd] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function getStats(title: string): TaskStats {
    return progressMap[title.toLowerCase()] ?? { total: 0, done: 0, inProgress: 0, pending: 0 }
  }

  const filtered = projects.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'planning') return p.status === 'planning'
    if (filter === 'active') return p.status === 'active'
    if (filter === 'completed') return p.status === 'completed'
    if (filter === 'paused') return p.status === 'paused'
    return p.type === filter
  })

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    avgProgress: projects.length > 0
      ? Math.round(projects.reduce((sum, p) => {
          const s = getStats(p.title)
          return sum + (s.total > 0 ? (s.done / s.total) * 100 : 0)
        }, 0) / projects.length)
      : 0,
  }

  function handleDelete(id: number) {
    if (!confirm('프로젝트를 삭제하시겠습니까?')) return
    startTransition(() => { deleteProject(id) })
  }
  function handleAddClose() { setShowAdd(false); router.refresh() }
  function handleEditClose() { setEditProject(null); router.refresh() }
  function openEdit(p: Project) { setDetailProject(null); setEditProject(p) }

  return (
    <div className="p-8">
      {/* 배너 */}
      <div className="relative bg-violet-950 rounded-2xl mb-6 overflow-hidden">
        <div className="h-1 bg-violet-500" />
        <div className="px-7 py-6">
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white mb-0.5">프로젝트 관리</h1>
              <p className="text-violet-300 text-sm">업무·개인·학습 프로젝트를 한 곳에서 추적하고 관리합니다</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-950 text-sm font-bold rounded-xl hover:bg-violet-50 transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              프로젝트 추가
            </button>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체 프로젝트', value: stats.total,       color: 'text-gray-700 dark:text-white' },
          { label: '진행 중',       value: stats.active,      color: 'text-blue-600 dark:text-blue-400' },
          { label: '완료',          value: stats.completed,   color: 'text-emerald-600 dark:text-emerald-400' },
          { label: '평균 달성률',   value: `${stats.avgProgress}%`, color: 'text-violet-600 dark:text-violet-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 탭 + 뷰 토글 */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex-shrink-0">
          <button onClick={() => changeView('card')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'card' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="카드 뷰">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button onClick={() => changeView('list')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="리스트 뷰">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm font-medium mb-2">
            {filter !== 'all' ? `${FILTERS.find(f => f.key === filter)?.label} 프로젝트가 없습니다` : '프로젝트가 없습니다'}
          </p>
          {filter === 'all' && (
            <button onClick={() => setShowAdd(true)} className="text-sm text-violet-500 hover:underline font-medium">
              + 첫 번째 프로젝트 추가하기
            </button>
          )}
        </div>
      )}

      {/* 카드 뷰 */}
      {view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} stats={getStats(p.title)}
              onDetail={setDetailProject} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* 리스트 뷰 */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {filtered.map((p, i) => (
            <div key={p.id} className={i !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
              <ProjectRow project={p} stats={getStats(p.title)}
                onDetail={setDetailProject} onEdit={openEdit} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {showAdd && <ProjectModal onClose={handleAddClose} />}
      {editProject && (
        <ProjectModal
          project={{
            ...editProject,
            startDate: editProject.startDate ? new Date(editProject.startDate) : null,
            endDate: editProject.endDate ? new Date(editProject.endDate) : null,
          }}
          onClose={handleEditClose}
        />
      )}
      {detailProject && (
        <ProjectDetailModal
          project={detailProject}
          taskStats={getStats(detailProject.title)}
          onClose={() => setDetailProject(null)}
          onEdit={() => openEdit(detailProject)}
        />
      )}
    </div>
  )
}
