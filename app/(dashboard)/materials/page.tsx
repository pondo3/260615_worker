import { verifySession } from '@/lib/dal'
import { getChannels, getCollectionRules, getMaterials } from '@/app/actions/materials'
import MaterialsClient from '@/components/materials/MaterialsClient'

export default async function MaterialsPage() {
  await verifySession()

  const [channels, rules, materials] = await Promise.all([
    getChannels(),
    getCollectionRules(),
    getMaterials(),
  ])

  return (
    <MaterialsClient
      initialChannels={channels.map((c) => ({
        id: c.id,
        channelId: c.channelId,
        channelName: c.channelName ?? '',
        thumbnailUrl: c.thumbnailUrl ?? '',
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      }))}
      initialRules={rules.map((r) => ({
        id: r.id,
        channelDbId: r.channelDbId,
        channelName: r.channel.channelName ?? '',
        channelId: r.channel.channelId,
        minViews: r.minViews,
        maxDaysOld: r.maxDaysOld,
        minLikes: r.minLikes,
        minComments: r.minComments,
        scheduleHour: r.scheduleHour,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
      }))}
      initialMaterials={materials.map((m) => ({
        id: m.id,
        url: m.url ?? null,
        platform: m.platform,
        videoId: m.videoId ?? null,
        originalTitle: m.originalTitle ?? null,
        translatedTitle: m.translatedTitle ?? null,
        isTranslated: m.isTranslated,
        translationEdited: m.translationEdited,
        channelName: m.channelName ?? null,
        channelId: m.channelId ?? null,
        thumbnailUrl: m.thumbnailUrl ?? null,
        viewCount: m.viewCount ?? null,
        likeCount: m.likeCount ?? null,
        commentCount: m.commentCount ?? null,
        uploadedAt: m.uploadedAt?.toISOString() ?? null,
        category: m.category ?? null,
        tags: m.tags as string[],
        memo: m.memo ?? null,
        scriptIdea: m.scriptIdea ?? null,
        importance: m.importance,
        status: m.status,
        usageStatus: m.usageStatus,
        plannedUseAt: m.plannedUseAt?.toISOString() ?? null,
        actualUsedAt: m.actualUsedAt?.toISOString() ?? null,
        collectedAt: m.collectedAt.toISOString(),
      }))}
    />
  )
}
