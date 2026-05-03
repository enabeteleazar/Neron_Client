import { NextRequest, NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const body        = await req.arrayBuffer()
    const contentType = req.headers.get('content-type') ?? ''

    console.log(`STT proxy → ${runtimeConfig.sttUrl}/transcribe (${body.byteLength} bytes)`)

    const upstream = await fetch(`${runtimeConfig.sttUrl}/transcribe`, {
      method:  'POST',
      headers: {
        'content-type':   contentType,
        'content-length': String(body.byteLength),
      },
      body,
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'STT proxy error'
    console.error('STT proxy error:', err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
