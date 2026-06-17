'use client'

import { useActionState, useEffect, useState } from 'react'
import { createIdea, updateIdea } from '@/app/actions/ideas'
import EditorWithAttachments from '@/components/editor/EditorWithAttachments'

export type IdeaItem = {
  id: number
  title: string
  content: string | null
  memo: string | null
  categoryId: number | null
  projectId: number | null
  resourceId: number | null
  status: string
  importance: string
  difficulty: string
  expectedEffect: string
  tags: string[]
  isFavorite: boolean
  dueDate: string | null
  relatedLinks: { id?: number; title: string; url: string; memo: string | null }[]
}

type RelatedLinkRow = { id?: number; title: string; url: string; memo: string }

type Props = {
  onClose: () => void
  idea?: IdeaItem
  categories: { id: number; name: string; color: string }[]
  projects: { id: number; title: string }[]
  resources: { id: number; title: string }[]
}

export const STATUS_OPTIONS = ['미정', '검토 중', '실행 예정', '진행 중', '완료', '보류', '폐기']
export const IMPORTANCE_OPTIONS = ['낮음', '보통', '높음', '매우 중요']
export const DIFFICULTY_OPTIONS = ['쉬움', '보통', '어려움', '매우 어려움']
export const EFFECT_OPTIONS = ['낮음', '보통', '높음', '매우 높음']

export const STATUS_CLS: Record<string, string> = {
  '미정':     'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  '검토 중':   'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  '실행 예정': 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  '진행 중':   'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  '완료':      'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  '보류':      'border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  '폐기':      'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
}
export const IMPORTANCE_CLS: Record<string, string> = {
  '낮음':     'border-gray-300 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  '보통':     'border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  '높음':     'border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  '매우 중요': 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
}

const LEVEL: Record<string, number> = {
  '낮음': 1, '쉬움': 1,
  '보통': 2,
  '높음': 3, '어려움': 3,
  '매우 높음': 4, '매우 어려움': 4, '매우 중요': 4,
}

export function getPriorityBadge(difficulty: string, expectedEffect: string): { label: string; cls: string } {
  const score = (LEVEL[expectedEffect] ?? 2) - (LEVEL[difficulty] ?? 2)
  if (score >= 1) return { label: '추천', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' }
  if (score === 0) return { label: '검토', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' }
  return { label: '보류 후보', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' }
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return null
  }
}

export default function IdeaModal({ onClose, idea, categories, projects, resources }: Props) {
  const isEdit = !!idea
  const action = isEdit ? updateIdea : createIdea
  const [state, formAction, pending] = useActionState(action, undefined)

  const [title, setTitle] = useState(idea?.title ?? '')
  const [memo, setMemo] = useState(idea?.memo ?? '')
  const [categoryId, setCategoryId] = useState(idea?.categoryId?.toString() ?? '')
  const [projectId, setProjectId] = useState(idea?.projectId?.toString() ?? '')
  const [resourceId, setResourceId] = useState(idea?.resourceId?.toString() ?? '')
  const [status, setStatus] = useState(idea?.status ?? '미정')
  const [importance, setImportance] = useState(idea?.importance ?? '보통')
  const [difficulty, setDifficulty] = useState(idea?.difficulty ?? '보통')
  const [expectedEffect, setExpectedEffect] = useState(idea?.expectedEffect ?? '보통')
  const [tagInput, setTagInput] = useState(idea?.tags?.join(', ') ?? '')
  const [dueDate, setDueDate] = useState(idea?.dueDate ?? '')
  const [isFavorite, setIsFavorite] = useState(idea?.isFavorite ?? false)
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkRow[]>(
    idea?.relatedLinks?.map((l) => ({ id: l.id, title: l.title, url: l.url, memo: l.memo ?? '' })) ?? []
  )

  const parsedTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
  const priorityBadge = getPriorityBadge(difficulty, expectedEffect)

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const linkErrors: Record<number, string> = {}
  const serializedLinks: { id?: number; title: string; url: string; memo: string | null }[] = []
  relatedLinks.forEach((link, i) => {
    const isEmpty = !link.title.trim() && !link.url.trim() && !link.memo.trim()
    if (isEmpty) return
    const normalized = normalizeLinkUrl(link.url)
    if (!normalized) {
      linkErrors[i] = link.url.trim() ? '올바른 URL 형식이 아닙니다.' : 'URL을 입력하세요.'
      return
    }
    serializedLinks.push({
      id: link.id,
      title: link.title.trim() || new URL(normalized).hostname,
      url: normalized,
      memo: link.memo.trim() || null,
    })
  })
  const hasLinkErrors = Object.keys(linkErrors).length > 0

  function addRelatedLinkRow() {
    setRelatedLinks((prev) => [...prev, { title: '', url: '', memo: '' }])
  }
  function updateRelatedLinkRow(i: number, patch: Partial<RelatedLinkRow>) {
    setRelatedLinks((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  function removeRelatedLinkRow(i: number) {
    setRelatedLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl bg-indigo-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {isEdit ? '아이디어 수정' : '아이디어 등록'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="flex-1 overflow-y-auto">
          {isEdit && <input type="hidden" name="id" value={idea.id} />}
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="memo" value={memo} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="resourceId" value={resourceId} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="importance" value={importance} />
          <input type="hidden" name="difficulty" value={difficulty} />
          <input type="hidden" name="expectedEffect" value={expectedEffect} />
          <input type="hidden" name="tags" value={JSON.stringify(parsedTags)} />
          <input type="hidden" name="dueDate" value={dueDate} />
          <input type="hidden" name="relatedLinks" value={JSON.stringify(serializedLinks)} />

          <div className="px-6 py-5 space-y-5">
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="아이디어 제목 *"
                className="w-full text-base font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-b-2 border-gray-100 dark:border-gray-800 focus:border-indigo-400 pb-2 transition-colors"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title[0]}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">내용</label>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${priorityBadge.cls}`}>{priorityBadge.label}</span>
              </div>
              <EditorWithAttachments
                name="content"
                entityType="idea"
                entityId={idea?.id}
                defaultValue={idea?.content ?? ''}
                placeholder="아이디어를 자유롭게 설명해보세요."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">카테고리</label>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2">카테고리가 없습니다. 카테고리 관리에서 먼저 추가해주세요.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(categoryId === String(cat.id) ? '' : String(cat.id))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                        categoryId === String(cat.id)
                          ? 'text-white border-transparent'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      style={categoryId === String(cat.id) ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">상태</label>
                <div className="flex flex-col gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                        status === s ? STATUS_CLS[s] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">중요도</label>
                <div className="flex flex-col gap-1.5">
                  {IMPORTANCE_OPTIONS.map((p) => (
                    <button key={p} type="button" onClick={() => setImportance(p)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                        importance === p ? IMPORTANCE_CLS[p] + ' border-current' : 'border-gray-100 dark:border-gray-800 text-gray-400'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">실행 난이도</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setDifficulty(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        difficulty === d ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">기대 효과</label>
                <div className="flex flex-wrap gap-1.5">
                  {EFFECT_OPTIONS.map((e) => (
                    <button key={e} type="button" onClick={() => setExpectedEffect(e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        expectedEffect === e ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">예정일</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">태그</label>
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                placeholder="쉼표로 구분 (예: 쇼츠, 자동화, 수익화)"
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors" />
              {parsedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {parsedTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs rounded-lg font-medium">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">메모</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                placeholder="짧은 참고 메모" rows={3}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors resize-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">관련 링크</label>
                <button type="button" onClick={addRelatedLinkRow}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  + 링크 추가
                </button>
              </div>
              {relatedLinks.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-1">참고 자료, 레퍼런스 링크 등을 추가해보세요.</p>
              ) : (
                <div className="space-y-2">
                  {relatedLinks.map((link, i) => (
                    <div key={link.id ?? `new-${i}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={link.title}
                          onChange={(e) => updateRelatedLinkRow(i, { title: e.target.value })}
                          placeholder="링크 제목"
                          className="flex-1 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors"
                        />
                        <button type="button" onClick={() => removeRelatedLinkRow(i)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        value={link.url}
                        onChange={(e) => updateRelatedLinkRow(i, { url: e.target.value })}
                        placeholder="https://..."
                        className="w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors"
                      />
                      {linkErrors[i] && <p className="text-[10px] text-red-500">{linkErrors[i]}</p>}
                      <input
                        value={link.memo}
                        onChange={(e) => updateRelatedLinkRow(i, { memo: e.target.value })}
                        placeholder="메모 (선택)"
                        className="w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-indigo-400 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                isFavorite
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-amber-300 hover:text-amber-500'
              }`}>
              <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {isFavorite ? '즐겨찾기 등록됨' : '즐겨찾기에 추가'}
            </button>
            <input type="hidden" name="isFavorite" value={String(isFavorite)} />

            {(projects.length > 0 || resources.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {projects.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">연결된 프로젝트</label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors">
                      <option value="">연결 안 함</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}
                {resources.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">연결된 자료</label>
                    <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors">
                      <option value="">연결 안 함</option>
                      {resources.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}
          </div>

          <div className="px-6 pb-5 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              취소
            </button>
            <button type="submit" disabled={pending || hasLinkErrors}
              title={hasLinkErrors ? '관련 링크의 URL을 확인해주세요.' : undefined}
              className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50">
              {pending ? '저장 중...' : isEdit ? '수정 완료' : '아이디어 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
