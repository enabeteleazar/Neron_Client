import { NextResponse } from 'next/server'
import { runtimeConfig } from '@/lib/config'

export async function GET() {
  try {
    const headers: Record<string, string> = {}
    if (runtimeConfig.apiKey) headers['X-API-Key'] = runtimeConfig.apiKey

    const res = await fetch(`${runtimeConfig.coreUrl}/status`, {
      headers,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json({ error: `Core ${res.status}` }, { status: res.status })

    const data = await res.json()

    // Normaliser pour l'UI : extraire agents depuis la structure /status
    return NextResponse.json({ agents: data.agents ?? {} })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'agents proxy error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
