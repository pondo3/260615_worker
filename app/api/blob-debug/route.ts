import { NextResponse } from 'next/server'

export async function GET() {
  const pub = process.env.PUBLIC_BLOB_READ_WRITE_TOKEN
  const priv = process.env.BLOB_READ_WRITE_TOKEN

  return NextResponse.json({
    PUBLIC_BLOB_READ_WRITE_TOKEN: pub
      ? `SET — starts with: ${pub.slice(0, 35)}...`
      : 'NOT SET',
    BLOB_READ_WRITE_TOKEN: priv
      ? `SET — starts with: ${priv.slice(0, 35)}...`
      : 'NOT SET',
  })
}
