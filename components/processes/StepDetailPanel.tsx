'use client'

import { useState } from 'react'
import { updateStep } from '@/app/actions/processes'
import type { ProcessStep, StepStatus } from './types'
import { STEP_STATUS_LABEL, STEP_STATUS_COLOR } from './types'

const STATUSES: StepStatus[] = ['pending', 'in_progress', 'review', 'completed', 'on_hold']

export default function StepDetailPanel({
  step,
  onClose,
  onStepUpdated,
}: {
  step: ProcessStep
  onClose: () => void
  onStepUpdated: (step: ProcessStep) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description ?? '')
  const [status, setStatus] = useState<StepStatus>(step.status)
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>(step.estimatedMinutes ?? '')
  const [completionCondition, setCompletionCondition] = useState(step.completionCondition ?? '')
  const [memo, setMemo] = useState(step.memo ?? '')
  const [checklist, setChecklist] = useState(step.checklist)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [relatedLinks, setRelatedLinks] = useState(step.relatedLinks)
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const updated: ProcessStep = {
      ...step,
      title,
      description: description || null,
      status,
      estimatedMinutes: estimatedMinutes === '' ? null : estimatedMinutes,
      completionCondition: completionCondition || null,
      memo: memo || null,
      checklist,
      relatedLinks,
    }
    await updateStep(step.id, {
      title,
      description: description || null,
      status,
      estimatedMinutes: estimatedMinutes === '' ? null : Number(estimatedMinutes),
      completionCondition: completionCondition || null,
      memo: memo || null,
      checklist,
      relatedLinks,
    })
    onStepUpdated(updated)
    setEditing(false)
    setSaving(false)
  }

  async function toggleChecklist(idx: number) {
    const newList = checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c)
    setChecklist(newList)
    await updateStep(step.id, { checklist: newList })
    onStepUpdated({ ...step, checklist: newList })
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    setChecklist((prev) => [...prev, { text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  function removeCheckItem(idx: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== idx))
  }

  async function addLink() {
    if (!newLinkUrl.trim()) return
    const newLink = { title: newLinkTitle.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }
    const newLinks = [...relatedLinks, newLink]
    setRelatedLinks(newLinks)
    setNewLinkTitle('')
    setNewLinkUrl('')
    await updateStep(step.id, { relatedLinks: newLinks })
    onStepUpdated({ ...step, relatedLinks: newLinks })
  }

  async function removeLink(idx: number) {
    const newLinks = relatedLinks.filter((_, i) => i !== idx)
    setRelatedLinks(newLinks)
    await updateStep(step.id, { relatedLinks: newLinks })
    onStepUpdated({ ...step, relatedLinks: newLinks })
  }

  function openAllLinks() {
    relatedLinks.forEach((link) => window.open(link.url, '_blank', 'noopener,noreferrer'))
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">단계 상세</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">취소</button>
              <button onClick={save} disabled={saving} className="px-2 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors">{saving ? '저장 중' : '저장'}</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">편집</button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* 단계명 */}
        <div>
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500 pb-1"
            />
          ) : (
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{step.title}</h3>
          )}
        </div>

        {/* 상태 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">상태</label>
          {editing ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StepStatus)}
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STEP_STATUS_LABEL[s]}</option>)}
            </select>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STEP_STATUS_COLOR[step.status]}`}>
              {STEP_STATUS_LABEL[step.status]}
            </span>
          )}
        </div>

        {/* 설명 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">설명</label>
          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">{step.description || <span className="text-gray-300 dark:text-gray-600 italic">없음</span>}</p>
          )}
        </div>

        {/* 예상 소요 시간 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">예상 소요 시간</label>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-24 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">분</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">{step.estimatedMinutes ? `${step.estimatedMinutes}분` : <span className="text-gray-300 dark:text-gray-600 italic">없음</span>}</p>
          )}
        </div>

        {/* 체크리스트 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">체크리스트</label>
          <div className="space-y-1.5">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(i)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 flex-shrink-0"
                />
                <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{item.text}</span>
                {editing && (
                  <button onClick={() => removeCheckItem(i)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
            {editing && (
              <div className="flex gap-1.5 mt-2">
                <input
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
                  placeholder="항목 추가..."
                  className="flex-1 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addCheckItem} className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">추가</button>
              </div>
            )}
          </div>
        </div>

        {/* 완료 조건 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">완료 조건</label>
          {editing ? (
            <textarea value={completionCondition} onChange={(e) => setCompletionCondition(e.target.value)} rows={2}
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">{step.completionCondition || <span className="text-gray-300 dark:text-gray-600 italic">없음</span>}</p>
          )}
        </div>

        {/* 관련 링크 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">관련 링크</label>
            {relatedLinks.length >= 2 && (
              <button
                onClick={openAllLinks}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                전체 열기
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {relatedLinks.length === 0 && !editing && (
              <p className="text-xs text-gray-300 dark:text-gray-600 italic">없음</p>
            )}
            {relatedLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-1.5 group rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1.5">
                <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{link.title}</span>
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-blue-500 transition-colors"
                  title={link.url}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
                {editing && (
                  <button onClick={() => removeLink(i)} className="flex-shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 dark:text-gray-600 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}

            {/* 링크 추가 폼 — 편집 모드와 무관하게 항상 표시 */}
            <div className="space-y-1 pt-0.5">
              <input
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="링크 제목 (선택)"
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600"
              />
              <div className="flex gap-1.5">
                <input
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLink()}
                  placeholder="https://..."
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 dark:placeholder-gray-600"
                />
                <button
                  onClick={addLink}
                  className="px-2.5 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">메모</label>
          {editing ? (
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{step.memo || <span className="text-gray-300 dark:text-gray-600 italic">없음</span>}</p>
          )}
        </div>
      </div>
    </div>
  )
}
