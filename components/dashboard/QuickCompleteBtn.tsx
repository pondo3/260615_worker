'use client'

import { useTransition } from 'react'
import { toggleTaskDone } from '@/app/actions/tasks'

export default function QuickCompleteBtn({ taskId, done }: { taskId: number; done: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => toggleTaskDone(taskId, !done))}
      disabled={pending}
      title={done ? '미완료로 변경' : '완료 처리'}
      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        done
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
      } ${pending ? 'opacity-50' : ''}`}
    >
      {done && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}
