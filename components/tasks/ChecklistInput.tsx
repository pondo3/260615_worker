'use client'

import { useState } from 'react'

export type CheckItem = { id: string; text: string; done: boolean }

export default function ChecklistInput({ defaultValue }: { defaultValue?: CheckItem[] }) {
  const [items, setItems] = useState<CheckItem[]>(defaultValue ?? [])

  function addItem() {
    setItems((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, text: '', done: false }])
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }
  function updateText(id: string, text: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, text } : item))
  }
  function toggleDone(id: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, done: !item.done } : item))
  }

  const doneCount = items.filter((i) => i.done).length

  return (
    <div>
      <input type="hidden" name="checklist" value={JSON.stringify(items)} />

      {items.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: items.length > 0 ? `${(doneCount / items.length) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{doneCount}/{items.length}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => toggleDone(item.id)}
              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                item.done
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              {item.done && (
                <svg className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateText(item.id, e.target.value)}
              placeholder={`항목 ${i + 1}`}
              className={`flex-1 text-sm outline-none bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 py-0.5 transition-colors ${
                item.done
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        항목 추가
      </button>
    </div>
  )
}
