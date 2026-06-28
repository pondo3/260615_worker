'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react'
import type { Process, ProcessStep, StepStatus } from '../types'
import { STEP_STATUS_LABEL, STEP_STATUS_DOT } from '../types'

// ─── 중심 노드 ────────────────────────────────────────────────────────────────

function RootNode({ data }: { data: { title: string; total: number; completed: number; category: string | null } }) {
  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
  return (
    <div className="relative w-36 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl text-white px-4 py-3 select-none">
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="source" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {data.category && (
        <p className="text-[9px] font-semibold uppercase tracking-widest text-blue-200 mb-1">{data.category}</p>
      )}
      <p className="text-xs font-bold leading-snug">{data.title}</p>
      <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-blue-100 mt-1">{data.completed}/{data.total}단계 · {pct}%</p>
    </div>
  )
}

// ─── 단계 노드 ────────────────────────────────────────────────────────────────

const STATUS_BG: Record<StepStatus, string> = {
  pending:     'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
  in_progress: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600',
  review:      'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600',
  completed:   'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600',
  on_hold:     'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-600',
}

function StepNode({ data }: {
  data: {
    step: ProcessStep
    onSelect: (s: ProcessStep) => void
    selected: boolean
    side: 'left' | 'right' | 'top' | 'bottom'
  }
}) {
  const { step, side } = data
  const doneCount = step.checklist.filter((c) => c.done).length
  return (
    <div
      onClick={() => data.onSelect(step)}
      className={`relative w-40 rounded-xl border-2 shadow-sm cursor-pointer transition-all select-none px-3 py-2 ${STATUS_BG[step.status]} ${data.selected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:shadow-md'}`}
    >
      <Handle type="target" position={side === 'right' ? Position.Left : side === 'left' ? Position.Right : side === 'top' ? Position.Bottom : Position.Top} className="!opacity-0" />
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STEP_STATUS_DOT[step.status]}`} />
        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">{STEP_STATUS_LABEL[step.status]}</span>
        {step.estimatedMinutes && (
          <span className="ml-auto text-[9px] text-gray-400">⏱{step.estimatedMinutes}m</span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">{step.title}</p>
      {step.checklist.length > 0 && (
        <div className="mt-1.5 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${Math.round((doneCount / step.checklist.length) * 100)}%` }}
          />
        </div>
      )}
      {step.description && (
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{step.description}</p>
      )}
    </div>
  )
}

const nodeTypes = { root: RootNode, step: StepNode }

// ─── 방사형 레이아웃 계산 ─────────────────────────────────────────────────────

type Side = 'left' | 'right' | 'top' | 'bottom'

type LayoutItem = { step: ProcessStep; x: number; y: number; side: Side }

function buildMindmapLayout(steps: ProcessStep[]): LayoutItem[] {
  if (steps.length === 0) return []

  const ROOT_X = 0
  const ROOT_Y = 0
  const GAP_X = 240
  const GAP_Y = 110

  // 단계를 4사분면으로 나눔: 오른쪽 위/아래, 왼쪽 위/아래
  const half = Math.ceil(steps.length / 2)
  const rightSteps = steps.slice(0, half)
  const leftSteps = steps.slice(half)

  const positionedSteps: { step: ProcessStep; x: number; y: number; side: Side }[] = []

  // 오른쪽 배치
  rightSteps.forEach((step, i) => {
    const total = rightSteps.length
    const startY = -((total - 1) * GAP_Y) / 2
    positionedSteps.push({
      step,
      x: ROOT_X + GAP_X,
      y: ROOT_Y + startY + i * GAP_Y,
      side: 'right',
    })
  })

  // 왼쪽 배치
  leftSteps.forEach((step, i) => {
    const total = leftSteps.length
    const startY = -((total - 1) * GAP_Y) / 2
    positionedSteps.push({
      step,
      x: ROOT_X - GAP_X,
      y: ROOT_Y + startY + i * GAP_Y,
      side: 'left',
    })
  })

  return positionedSteps
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function MindmapView({
  process,
  onSelectStep,
  selectedStepId,
}: {
  process: Process
  onSelectStep: (step: ProcessStep | null) => void
  selectedStepId: number | null
  onStepsChange: (steps: ProcessStep[]) => void
}) {
  const completedCount = process.steps.filter((s) => s.status === 'completed').length

  const layout = useMemo(() => buildMindmapLayout(
    [...process.steps].sort((a, b) => a.order - b.order)
  ), [process.steps])

  const initialNodes: Node[] = useMemo(() => [
    {
      id: 'root',
      type: 'root',
      position: { x: 400, y: 300 },
      data: {
        title: process.title,
        total: process.steps.length,
        completed: completedCount,
        category: process.category,
      },
      draggable: false,
    },
    ...layout.map(({ step, x, y, side }) => ({
      id: String(step.id),
      type: 'step',
      position: { x: 400 + x - 70, y: 300 + y - 40 },
      data: {
        step,
        onSelect: (s: ProcessStep) => onSelectStep(selectedStepId === s.id ? null : s),
        selected: step.id === selectedStepId,
        side,
      },
      draggable: false,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [process.id, process.steps.length, completedCount, selectedStepId])

  const initialEdges: Edge[] = useMemo(() => layout.map(({ step }) => ({
    id: `root-${step.id}`,
    source: 'root',
    target: String(step.id),
    type: 'smoothstep',
    style: { stroke: '#6366f1', strokeWidth: 1.5, opacity: 0.5 },
  })), [layout])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // process 바뀌면 리셋
  useEffect(() => {
    setNodes([
      {
        id: 'root',
        type: 'root',
        position: { x: 400, y: 300 },
        data: {
          title: process.title,
          total: process.steps.length,
          completed: completedCount,
          category: process.category,
        },
        draggable: false,
      },
      ...layout.map(({ step, x, y, side }) => ({
        id: String(step.id),
        type: 'step',
        position: { x: 400 + x - 70, y: 300 + y - 40 },
        data: {
          step,
          onSelect: (s: ProcessStep) => onSelectStep(selectedStepId === s.id ? null : s),
          selected: step.id === selectedStepId,
          side,
        },
        draggable: false,
      })),
    ])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process.id, process.steps.length, completedCount, selectedStepId])

  if (process.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center space-y-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm">단계를 추가하면 마인드맵이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        zoomOnDoubleClick={false}
        className="bg-gray-50 dark:bg-gray-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e5e7eb" className="dark:opacity-20" />
        <Controls showInteractive={false} className="!shadow-sm !border !border-gray-200 dark:!border-gray-700 !rounded-xl overflow-hidden" />
      </ReactFlow>
    </div>
  )
}
