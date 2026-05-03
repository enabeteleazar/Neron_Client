import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

interface NeronYaml {
  neron?: {
    api_key?: string
    endpoints?: {
      server_health?: string
    }
  }
}

function loadYaml(): NeronYaml {
  try {
    const raw = fs.readFileSync('/etc/neron/neron.yaml', 'utf8')
    return yaml.load(raw) as NeronYaml
  } catch {
    return {}
  }
}

function getCoreUrl(cfg: NeronYaml): string {
  const health = cfg.neron?.endpoints?.server_health ?? ''
  if (health) {
    // "http://localhost:8010/health" → "http://localhost:8010"
    return health.replace(/\/[^/]+$/, '')
  }
  return process.env.NERON_CORE_URL?.replace(/\/$/, '') ?? 'http://localhost:8010'
}

const yaml_cfg = loadYaml()

export const runtimeConfig = {
  coreUrl: getCoreUrl(yaml_cfg),
  sttUrl:  process.env.NERON_STT_URL?.replace(/\/$/, '') ?? 'http://localhost:8001',
  apiKey:  yaml_cfg.neron?.api_key ?? process.env.NERON_API_KEY ?? '',
}
