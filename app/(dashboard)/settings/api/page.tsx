import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import ApiKeyManager from '@/components/settings/ApiKeyManager'

function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + '...'
  return key.slice(0, 8) + '...' + key.slice(-4)
}

export default async function ApiSettingsPage() {
  const session = await verifySession()

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.userId },
    orderBy: [{ service: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <ApiKeyManager
      apiKeys={apiKeys.map((k) => ({
        id: k.id,
        service: k.service,
        label: k.label,
        maskedKey: maskKey(k.keyValue),
        isActive: k.isActive,
        quotaExceeded: k.quotaExceeded,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        lastError: k.lastError,
        sortOrder: k.sortOrder,
        createdAt: k.createdAt.toISOString(),
      }))}
    />
  )
}
