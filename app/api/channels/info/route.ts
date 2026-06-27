import { type NextRequest } from 'next/server'
import { verifySession } from '@/lib/dal'
import { fetchChannelInfo, getActiveApiKey } from '@/lib/youtube-collect'

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession()
    const input = request.nextUrl.searchParams.get('channelId') ?? ''
    if (!input.trim()) {
      return Response.json({ error: '채널 ID 또는 URL을 입력해주세요.' }, { status: 400 })
    }

    const apiKey = await getActiveApiKey(session.userId)
    if (!apiKey) {
      return Response.json({ error: 'YouTube API 키가 설정되지 않았습니다. 설정 > API 키 관리에서 추가해주세요.' }, { status: 400 })
    }

    const info = await fetchChannelInfo(input, apiKey)
    if (!info) {
      return Response.json({ error: '채널을 찾을 수 없습니다. URL 또는 채널 ID를 확인해주세요.' }, { status: 404 })
    }

    return Response.json({
      channelId: info.channelId,
      channelName: info.channelName,
      thumbnailUrl: info.thumbnailUrl,
    })
  } catch {
    return Response.json({ error: '채널 정보를 가져오지 못했습니다.' }, { status: 500 })
  }
}
