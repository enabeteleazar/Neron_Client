# neron-vocal

Interface vocale de Néron — Next.js 16, HTTPS via Tailscale.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16 + React 19, TypeScript |
| Serveur HTTPS | Node.js custom (`server.js`) + certificats Tailscale |
| STT | faster-whisper intégré dans neron-core (`/input/audio`) |
| TTS | Web Speech API (navigateur) |
| Config | `/etc/neron/neron.yaml` |

## Architecture

```
Mobile / Navigateur (HTTPS :8443)
        │
        ▼
  client_vocal (Next.js)
        │
        ├── GET  /api/agents  ──► neron-core :8010/status
        ├── POST /api/audio   ──► neron-core :8010/input/audio
        │                              │
        │                        Whisper tiny (STT)
        │                              │
        │                        llama3.2:1b (LLM)
        │                              │
        │                     {transcription, response}
        └── TTS ◄────────────── Web Speech API (fr-FR)
```

## Prérequis

- Node.js ≥ 20
- `neron-core` actif sur `:8010` avec STT activé
- Certificat Tailscale généré dans `/var/lib/tailscale/certs/`
- Section `client_vocal` dans `/etc/neron/neron.yaml`

## Configuration

Tout est lu depuis `/etc/neron/neron.yaml` — ne pas éditer `.env.local` manuellement.

```yaml
# /etc/neron/neron.yaml

client_vocal:
  domain: homebox.tail7f8e60.ts.net
  port:   8443

stt:
  model:        tiny       # tiny | small | medium
  language:     fr
  device:       cpu
  compute_type: int8
```

Les variables d'environnement suivantes sont lues en fallback si le YAML n'est pas disponible :

| Variable | Défaut |
|----------|--------|
| `NERON_CORE_URL` | `http://localhost:8010` |
| `NERON_STT_URL`  | `http://localhost:8001` |
| `NERON_API_KEY`  | _(vide)_ |

## Installation

```bash
cd /etc/neron/client_vocal
npm install
npm run build
```

## Démarrage

### Manuel

```bash
npm start
# → https://homebox.tail7f8e60.ts.net:8443
```

### Systemd (production)

```bash
sudo systemctl enable --now neron-vocal
sudo journalctl -u neron-vocal -f
```

Le service rebuild automatiquement au démarrage via `ExecStartPre=npm run build`.

### PM2

```bash
pm2 start ecosystem.config.js
pm2 save
```

## Certificats TLS

Les certificats sont générés par Tailscale et lus directement depuis `/var/lib/tailscale/certs/` :

```bash
# Renouveler le certificat
sudo tailscale cert homebox.tail7f8e60.ts.net
sudo systemctl restart neron-vocal
```

## Routes API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/audio` | POST | Proxy audio → `neron-core /input/audio` |
| `/api/agents` | GET | Proxy statut agents → `neron-core /status` |
| `/api/config` | GET | Config runtime (lecture seule) |
| `/api/health` | GET | Santé du service Next.js |
| `/api/stt` | POST | _(legacy — non utilisé)_ |
| `/api/core` | POST | Proxy texte → `neron-core /input/text` |

## Pipeline vocal

1. **Appui sur l'orbe** → démarrage enregistrement `MediaRecorder`
2. **Relâchement** → envoi audio à `/api/audio`
3. **neron-core** → transcription Whisper + réponse LLM
4. **Affichage** transcription (Vous) + réponse (Néron)
5. **TTS** → `SpeechSynthesisUtterance` fr-FR

## Performances (Pentium G3240T / 7GB RAM)

| Étape | Durée |
|-------|-------|
| Whisper tiny — transcription | ~1-4s |
| llama3.2:1b — génération | ~60-100s |
| TTS navigateur | instantané |

## Fichiers

```
client_vocal/
├── server.js              # Serveur HTTPS Node.js (lit neron.yaml)
├── next.config.js         # Config Next.js
├── ecosystem.config.js    # Config PM2
├── package.json
├── .env.local             # Fallback env (ne pas versionner les secrets)
└── src/
    ├── app/
    │   ├── page.tsx           # UI principale — orbe, waveform, conversation
    │   ├── layout.tsx         # Layout global
    │   ├── globals.css        # Styles (thème sombre, variables CSS)
    │   └── api/
    │       ├── audio/route.ts     # Proxy /input/audio
    │       ├── agents/route.ts    # Proxy /status
    │       ├── config/route.ts    # Config lecture seule
    │       ├── core/route.ts      # Proxy /input/text
    │       ├── health/route.ts    # Health check
    │       └── stt/route.ts       # Legacy
    └── lib/
        └── config.ts          # Lecture neron.yaml + env fallback
```
