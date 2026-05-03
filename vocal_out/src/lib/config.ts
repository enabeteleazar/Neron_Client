/**
 * Config in-memory partagée entre les route handlers.
 * Fonctionne en mode Node.js (next start / PM2) — le process persiste.
 * En dev avec Turbopack, chaque restart réinitialise aux valeurs d'env.
 */
export const runtimeConfig = {
  coreUrl: process.env.NERON_CORE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000',
  sttUrl:  process.env.NERON_STT_URL?.replace(/\/$/, '')  ?? 'http://localhost:8001',
  apiKey:  process.env.NERON_API_KEY ?? '',
}
