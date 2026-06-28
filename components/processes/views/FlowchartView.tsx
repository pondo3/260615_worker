'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
} from '@xyflow/react'
import { saveNodePosition, createConnection, deleteConnection } from '@/app/actions/processes'
import type { Process, ProcessStep, StepStatus } from '../types'
import { STEP_STATUS_DOT, STEP_STATUS_LABEL } from '../types'

// ─── 커스텀 노드 ─────────────────────────────────────────────────────────────

const STATUS_BG: Record<StepStatus, string> = {
  pending:     'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
  in_progress: 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30',
  review:      'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30',
  completed:   'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  on_hold:     'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/30',
}

function StepNode({ data, selected }: { data: { step: ProcessStep; onSelect: (s: ProcessStep) => void }; selected: boolean }) {
  const { step } = data
  return (
    <div
      onClick={() => data.onSelect(step)}
      className={`w-44 rounded-xl border-2 shadow-sm cursor-pointer transition-all select-none ${STATUS_BG[step.status]} ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:shadow-md'}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-2 !border-gray-300 dark:!border-gray-600 !bg-white dark:!bg-gray-900"
      />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STEP_STATUS_DOT[step.status]}`} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{STEP_STATUS_LABEL[step.status]}</span>
          {step.estimatedMinutes && (
            <span className="ml-auto text-[9px] text-gray-400">⏱{step.estimatedMinutes}m</span>
          )}
        </div>
        <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">{step.title}</p>
        {step.checklist.length > 0 && (
          <p className="text-[9px] text-gray-400 mt-1">
            ✓ {step.checklist.filter((c) => c.done).length}/{step.checklist.length}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-2 !border-blue-400 !bg-white dark:!bg-gray-900"
      />
    </div>
  )
}

const nodeTypes = { step: StepNode }

// ─── 기본 레이아웃 계산 ───────────────────────────────────────────────────────

function buildLayout(steps: ProcessStep[]): { id: string; x: number; y: number }[] {
  const COLS = 4
  const GAP_X = 220
  const GAP_Y = 140
  return steps.map((s, i) => ({
    id: String(s.id),
    x: s.posX ?? (i % COLS) * GAP_X + 40,
    y: s.posY ?? Math.floor(i / COLS) * GAP_Y + 40,
  }))
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function FlowchartView({
  process,
  onSelectStep,
  selectedStepId,
  onStepsChange,
}: {
  process: Process
  onSelectStep: (step: ProcessStep | null) => void
  selectedStepId: number | null
  onStepsChange: (steps: ProcessStep[]) => void
}) {
  const layout = buildLayout(process.steps)

  const initialNodes: Node[] = process.steps.map((step) => {
    const pos = layout.find((l) => l.id === String(step.id))!
    return {
      id: String(step.id),
      type: 'step',
      position: { x: pos.x, y: pos.y },
      data: { step, onSelect: (s: ProcessStep) => onSelectStep(selectedStepId === s.id ? null : s) },
      selected: step.id === selectedStepId,
    }
  })

  const EDGE_COLOR: Record<string, string> = {
    sequential:  '#6366f1',
    parallel:    '#0ea5e9',
    conditional: '#f59e0b',
  }

  const initialEdges: Edge[] = process.connections.map((c) => ({
    id: String(c.id),
    source: String(c.fromStepId),
    target: String(c.toStepId),
    label: c.label || undefined,
    type: 'smoothstep',
    style: { stroke: EDGE_COLOR[c.type] ?? '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[c.type] ?? '#6366f1' },
    animated: false,
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [connectionType] = useState<'sequential' | 'parallel' | 'conditional'>('sequential')

  // process가 바뀌면 노드/엣지 리셋
  useEffect(() => {
    const layout = buildLayout(process.steps)
    setNodes(process.steps.map((step) => {
      const pos = layout.find((l) => l.id === String(step.id))!
      return {
        id: String(step.id),
        type: 'step',
        position: { x: pos.x, y: pos.y },
        data: { step, onSelect: (s: ProcessStep) => onSelectStep(selectedStepId === s.id ? null : s) },
        selected: step.id === selectedStepId,
      }
    }))
    setEdges(process.connections.map((c) => ({
      id: String(c.id),
      source: String(c.fromStepId),
      target: String(c.toStepId),
      label: c.label || undefined,
      type: 'smoothstep',
      style: { stroke: EDGE_COLOR[c.type] ?? '#6366f1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[c.type] ?? '#6366f1' },
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process.id, process.steps.length, process.connections.length])

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return
      const fromId = parseInt(params.source)
      const toId = parseInt(params.target)
      if (fromId === toId) return
      const color = EDGE_COLOR[connectionType]
      const newEdge: Edge = {
        ...params,
        id: `e${fromId}-${toId}`,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      }
      setEdges((eds) => addEdge(newEdge, eds))
      await createConnection(process.id, fromId, toId, connectionType)
    },
    [connectionType, process.id, setEdges]
  )

  const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
    for (const e of deletedEdges) {
      const connId = parseInt(e.id)
      if (!isNaN(connId)) await deleteConnection(connId)
    }
  }, [])

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const stepId = parseInt(node.id)
      saveNodePosition(stepId, node.position.x, node.position.y)
      onStepsChange(process.steps.map((s) =>
        s.id === stepId ? { ...s, posX: node.position.x, posY: node.position.y } : s
      ))
    },
    [process.steps, onStepsChange]
  )

  if (process.steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center space-y-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-sm">단계를 추가하면 순서도가 표시됩니다.</p>
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
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        className="bg-gray-50 dark:bg-gray-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" className="dark:opacity-30" />
        <Controls className="!shadow-sm !border !border-gray-200 dark:!border-gray-700 !rounded-xl overflow-hidden" />
        <MiniMap className="!border !border-gray-200 dark:!border-gray-700 !rounded-xl" nodeStrokeWidth={3} />

        <Panel position="top-right" className="flex gap-2 text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-violet-500 inline-block" /> 순차</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-sky-500 inline-block" /> 병렬</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 inline-block" /> 조건부</span>
          <span className="ml-1 text-gray-300 dark:text-gray-600">|</span>
          <span>노드 끌어서 연결 · Del로 삭제</span>
        </Panel>
      </ReactFlow>
    </div>
  )
}
