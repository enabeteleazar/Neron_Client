import { NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function GET() {
  try {
    const res = await fetch(`${runtimeConfig.coreUrl}/status/agents`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Core ${res.status}` }, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'agents proxy error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
