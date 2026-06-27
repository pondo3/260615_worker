export type StepStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'on_hold'
export type ConnectionType = 'sequential' | 'parallel' | 'conditional'
export type ProcessStatus = 'active' | 'archived' | 'draft'

export type ProcessStep = {
  id: number
  processId: number
  title: string
  description: string | null
  order: number
  status: StepStatus
  checklist: Array<{ text: string; done: boolean }>
  estimatedMinutes: number | null
  completionCondition: string | null
  relatedLinks: Array<{ title: string; url: string }>
  memo: string | null
  posX: number | null
  posY: number | null
  createdAt: string
  updatedAt: string
}

export type ProcessConnection = {
  id: number
  processId: number
  fromStepId: number
  toStepId: number
  type: ConnectionType
  label: string | null
}

export type Process = {
  id: number
  title: string
  description: string | null
  category: string | null
  purpose: string | null
  status: ProcessStatus
  importance: string
  tags: string[]
  isTemplate: boolean
  isFavorite: boolean
  projectId: number | null
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  executionCount: number
  steps: ProcessStep[]
  connections: ProcessConnection[]
}

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  pending: '대기',
  in_progress: '진행 중',
  review: '검토 중',
  completed: '완료',
  on_hold: '보류',
}

export const STEP_STATUS_COLOR: Record<StepStatus, string> = {
  pending: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  review: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  on_hold: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
}

export const STEP_STATUS_DOT: Record<StepStatus, string> = {
  pending: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  completed: 'bg-emerald-500',
  on_hold: 'bg-rose-500',
}

export const CATEGORIES = ['업무용', '콘텐츠용', '개발용', '개인용']
export const IMPORTANCE_OPTIONS = ['높음', '보통', '낮음']
