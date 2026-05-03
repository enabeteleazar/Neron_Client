import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (runtimeConfig.apiKey) headers['X-API-Key'] = runtimeConfig.apiKey

    const upstream = await fetch(`${runtimeConfig.coreUrl}/input/text`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(body),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json({ error: text }, { status: upstream.status })
    }

    return NextResponse.json(await upstream.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Core proxy error'
    console.error('Core proxy error:', err)
    return NextResponse.json({ error: `Core inaccessible : ${message}` }, { status: 502 })
  }
}
