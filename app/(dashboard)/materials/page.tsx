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
        videoId: m.videoId,
        title: m.title ?? '',
        channelName: m.channelName ?? '',
        channelId: m.channelId ?? '',
        viewCount: m.viewCount ?? 0,
        likeCount: m.likeCount ?? 0,
        commentCount: m.commentCount ?? 0,
        publishedAt: m.publishedAt?.toISOString() ?? null,
        thumbnailUrl: m.thumbnailUrl ?? '',
        platform: m.platform,
        isUsed: m.isUsed,
        usedAt: m.usedAt?.toISOString() ?? null,
        collectedAt: m.collectedAt.toISOString(),
      }))}
    />
  )
}
