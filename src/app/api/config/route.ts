import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json({
    coreUrl: runtimeConfig.coreUrl,
    sttUrl:  runtimeConfig.sttUrl,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { coreUrl?: string; sttUrl?: string }

  if (body.coreUrl) runtimeConfig.coreUrl = body.coreUrl.replace(/\/$/, '')
  if (body.sttUrl)  runtimeConfig.sttUrl  = body.sttUrl.replace(/\/$/, '')

  console.log(`Config updated — Core: ${runtimeConfig.coreUrl} | STT: ${runtimeConfig.sttUrl}`)

  return NextResponse.json({
    coreUrl: runtimeConfig.coreUrl,
    sttUrl:  runtimeConfig.sttUrl,
  })
}
