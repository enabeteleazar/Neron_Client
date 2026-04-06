import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const upstream = await fetch(`${runtimeConfig.coreUrl}/input/text`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
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
