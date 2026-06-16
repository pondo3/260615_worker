'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory, CategoryFormState } from '@/app/actions/resources'

type Category = { id: number; name: string; description: string | null; color: string; sortOrder: number; _count: { resources: number } }

type Props = { onClose: () => void; categories: Category[] }

const PRESET_COLORS = [
  '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#6B7280',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">색상</label>
      <div className="flex items-center gap-2 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="직접 선택"
        />
      </div>
    </div>
  )
}

function CategoryForm({
  onDone,
  editing,
}: {
  onDone: () => void
  editing?: Category
}) {
  const action = editing ? updateCategory : createCategory
  const [state, formAction, pending] = useActionState(action, undefined)
  const [name, setName] = useState(editing?.name ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [color, setColor] = useState(editing?.color ?? '#0EA5E9')
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0))

  useEffect(() => {
    if (state && 'success' in state && state.success) onDone()
  }, [state, onDone])

  const errors = state && 'errors' in state ? state.errors : {}

  return (
    <form action={formAction} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
        {editing ? '카테고리 수정' : '새 카테고리 추가'}
      </p>
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="sortOrder" value={sortOrder} />

      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="카테고리명 *"
          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-teal-400 transition-colors"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="설명 (선택)"
        className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-teal-400 transition-colors"
      />

      <ColorPicker value={color} onChange={setColor} />

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">정렬 순서</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          min="0"
          className="w-24 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-teal-400 transition-colors"
        />
      </div>

      {errors.general && <p className="text-xs text-red-500">{errors.general[0]}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone}
          className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          취소
        </button>
        <button type="submit" disabled={pending}
          className="flex-1 py-2 rounded-lg bg-teal-500 text-xs font-bold text-white hover:bg-teal-600 transition-colors disabled:opacity-50">
          {pending ? '저장 중...' : editing ? '수정' : '추가'}
        </button>
      </div>
    </form>
  )
}

export default function CategoryManager({ onClose, categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: number; msg: string } | null>(null)

  function handleFormDone() {
    setShowAddForm(false)
    setEditingId(null)
    router.refresh()
  }

  function handleDelete(cat: Category) {
    if (cat._count.resources > 0) {
      setDeleteError({ id: cat.id, msg: `이 카테고리에 자료 ${cat._count.resources}개가 있습니다. 먼저 자료를 다른 카테고리로 이동하거나 삭제해주세요.` })
      return
    }
    startTransition(async () => {
      const result = await deleteCategory(cat.id)
      if (result && 'error' in result) {
        setDeleteError({ id: cat.id, msg: result.error ?? '삭제 실패' })
      } else {
        router.refresh()
      }
    })
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'))

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 flex-shrink-0 rounded-t-2xl bg-teal-500" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">카테고리 관리</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* 카테고리 목록 */}
          {sorted.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">카테고리가 없습니다.</p>
          )}

          {sorted.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <CategoryForm editing={cat} onDone={handleFormDone} />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{cat.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{cat._count.resources}개</span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(cat.id); setShowAddForm(false); setDeleteError(null) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setDeleteError(null); handleDelete(cat) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {deleteError?.id === cat.id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 px-1">{deleteError.msg}</p>
              )}
            </div>
          ))}

          {showAddForm && <CategoryForm onDone={handleFormDone} />}
        </div>

        <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 flex-shrink-0">
          {!showAddForm && editingId === null && (
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); setDeleteError(null) }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              + 카테고리 추가
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
