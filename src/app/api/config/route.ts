import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json({
    coreUrl: runtimeConfig.coreUrl,
    sttUrl:  runtimeConfig.sttUrl,
    apiKey:  runtimeConfig.apiKey ? '***' : '',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { coreUrl?: string; sttUrl?: string; apiKey?: string }

  if (body.coreUrl) runtimeConfig.coreUrl = body.coreUrl.replace(/\/$/, '')
  if (body.sttUrl)  runtimeConfig.sttUrl  = body.sttUrl.replace(/\/$/, '')
  if (body.apiKey !== undefined) runtimeConfig.apiKey = body.apiKey

  console.log(`Config updated — Core: ${runtimeConfig.coreUrl} | STT: ${runtimeConfig.sttUrl}`)

  return NextResponse.json({
    coreUrl: runtimeConfig.coreUrl,
    sttUrl:  runtimeConfig.sttUrl,
    apiKey:  runtimeConfig.apiKey ? '***' : '',
  })
}
