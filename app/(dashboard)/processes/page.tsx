import { verifySession } from '@/lib/dal'
import { getProcesses } from '@/app/actions/processes'
import ProcessesClient from '@/components/processes/ProcessesClient'

export default async function ProcessesPage() {
  await verifySession()
  const processes = await getProcesses()

  return (
    <ProcessesClient
      initialProcesses={processes.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        purpose: p.purpose,
        status: p.status,
        importance: p.importance,
        tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
        isTemplate: p.isTemplate,
        isFavorite: p.isFavorite,
        projectId: p.projectId,
        lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        executionCount: p._count.executions,
        steps: p.steps.map((s) => ({
          id: s.id,
          processId: s.processId,
          title: s.title,
          description: s.description,
          order: s.order,
          status: s.status,
          checklist: Array.isArray(s.checklist) ? (s.checklist as Array<{ text: string; done: boolean }>) : [],
          estimatedMinutes: s.estimatedMinutes,
          completionCondition: s.completionCondition,
          relatedLinks: Array.isArray(s.relatedLinks) ? (s.relatedLinks as Array<{ title: string; url: string }>) : [],
          memo: s.memo,
          posX: s.posX,
          posY: s.posY,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        connections: p.connections.map((c) => ({
          id: c.id,
          processId: c.processId,
          fromStepId: c.fromStepId,
          toStepId: c.toStepId,
          type: c.type,
          label: c.label,
        })),
      }))}
    />
  )
}
