import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function GET() {
  const token = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'PUBLIC_BLOB_READ_WRITE_TOKEN not set' })
  }

  try {
    const result = await put('debug-test.txt', 'hello', {
      access: 'public',
      token,
      contentType: 'text/plain',
    })
    // Clean up test file
    return NextResponse.json({
      success: true,
      url: result.url,
      token_prefix: token.slice(0, 35) + '...',
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      token_prefix: token.slice(0, 35) + '...',
    })
  }
}
