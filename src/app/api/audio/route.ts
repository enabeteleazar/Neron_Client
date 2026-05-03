import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const headers: Record<string, string> = {}
    if (runtimeConfig.apiKey) headers['X-API-Key'] = runtimeConfig.apiKey

    const upstream = await fetch(`${runtimeConfig.coreUrl}/input/audio`, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(120_000),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json({ error: text }, { status: upstream.status })
    }

    return NextResponse.json(await upstream.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'audio proxy error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
