'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'
type MsgType    = 'user' | 'neron' | 'error'

interface Msg {
  id:    number
  type:  MsgType
  label: string
  text:  string
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const BAR_COUNT       = 15
const FETCH_TIMEOUT   = 30_000

const STATUS: Record<VoiceState, string> = {
  idle:       'Appuyer pour parler',
  listening:  'Enregistrement en cours...',
  processing: 'Néron réfléchit...',
  speaking:   'Néron parle',
}

/* ------------------------------------------------------------------ */
/* SVG icons                                                            */
/* ------------------------------------------------------------------ */

function IconMic() {
  return (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </>
  )
}

function IconLoader() {
  return (
    <>
      <line x1="12"   y1="2"     x2="12"   y2="6"/>
      <line x1="12"   y1="18"    x2="12"   y2="22"/>
      <line x1="4.93" y1="4.93"  x2="7.76" y2="7.76"/>
      <line x1="16.24"y1="16.24" x2="19.07"y2="19.07"/>
      <line x1="2"    y1="12"    x2="6"    y2="12"/>
      <line x1="18"   y1="12"    x2="22"   y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24"y1="7.76"  x2="19.07"y2="4.93"/>
    </>
  )
}

function IconVolume() {
  return (
    <>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </>
  )
}

function IconSettings() {
  return (
    <>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms / 1000}s`)), ms)
    ),
  ])
}

/* ------------------------------------------------------------------ */
/* Page component                                                       */
/* ------------------------------------------------------------------ */

export default function Home() {
  /* ---------- State ---------- */
  const [voiceState,    setVoiceStateRaw] = useState<VoiceState>('idle')
  const [messages,      setMessages]      = useState<Msg[]>([])
  const [hasMsgs,       setHasMsgs]       = useState(false)
  const [settingsOpen,  setSettingsOpen]   = useState(false)
  const [coreUrlInput,  setCoreUrlInput]   = useState('')
  const [sttUrlInput,   setSttUrlInput]    = useState('')

  /* ---------- Refs ---------- */
  const voiceStateRef     = useRef<VoiceState>('idle')
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const audioChunksRef    = useRef<Blob[]>([])
  const audioStreamRef    = useRef<MediaStream | null>(null)
  const waveformAnimRef   = useRef<number | null>(null)
  const waveformDataRef   = useRef<{ el: HTMLDivElement; target: number; current: number; phase: number }[]>([])
  const waveformBarsRef   = useRef<HTMLDivElement>(null)
  const conversationRef   = useRef<HTMLDivElement>(null)
  const msgIdRef          = useRef(0)

  /* Sync ref with state so callbacks always see the latest value */
  const setVoiceState = useCallback((s: VoiceState) => {
    voiceStateRef.current = s
    setVoiceStateRaw(s)
    document.body.className = `state-${s}`
  }, [])

  /* ---------- Waveform ---------- */
  const initWaveform = useCallback(() => {
    const container = waveformBarsRef.current
    if (!container) return
    container.innerHTML = ''
    waveformDataRef.current = []
    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = document.createElement('div')
      bar.className = 'waveform-bar'
      container.appendChild(bar)
      waveformDataRef.current.push({ el: bar, target: 4, current: 4, phase: Math.random() * Math.PI * 2 })
    }
  }, [])

  const stopWaveform = useCallback(() => {
    if (waveformAnimRef.current) {
      cancelAnimationFrame(waveformAnimRef.current)
      waveformAnimRef.current = null
    }
    waveformDataRef.current.forEach(b => {
      b.current = 4
      b.el.style.height = '4px'
    })
  }, [])

  const startWaveform = useCallback(() => {
    stopWaveform()
    const animate = () => {
      waveformDataRef.current.forEach((b, i) => {
        b.phase += 0.08 + Math.random() * 0.04
        const maxH = 8 + Math.sin(b.phase + i * 0.4) * 14 + Math.random() * 8
        b.target  = Math.max(4, maxH)
        b.current += (b.target - b.current) * 0.15
        b.el.style.height = `${b.current}px`
      })
      waveformAnimRef.current = requestAnimationFrame(animate)
    }
    waveformAnimRef.current = requestAnimationFrame(animate)
  }, [stopWaveform])

  /* ---------- Messages ---------- */
  const addMessage = useCallback((type: MsgType, label: string, text: string) => {
    setMessages(prev => [...prev, { id: msgIdRef.current++, type, label, text }])
    setHasMsgs(true)
    setTimeout(() => {
      const el = conversationRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 50)
  }, [])

  /* ---------- Recording ---------- */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mimeTypes  = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      const mimeType   = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) ?? ''
      const recorder   = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start(100)
      mediaRecorderRef.current = recorder
      return true
    } catch {
      return false
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      const stream   = audioStreamRef.current
      if (!recorder || !stream) { resolve(null); return }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/mp4'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        stream.getTracks().forEach(t => t.stop())
        mediaRecorderRef.current = null
        audioStreamRef.current   = null
        audioChunksRef.current   = []
        resolve(blob)
      }
      recorder.stop()
    })
  }, [])

  /* ---------- API calls ---------- */
  const sendToSTT = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('file', blob, 'audio.wav')
    const res  = await withTimeout(fetch('/api/stt', { method: 'POST', body: formData }), FETCH_TIMEOUT)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `STT ${res.status}`)
    return (data.text ?? '').trim()
  }, [])

  const sendToCore = useCallback(async (text: string): Promise<string> => {
    const res  = await withTimeout(
      fetch('/api/core', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      }),
      FETCH_TIMEOUT
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Core ${res.status}`)
    return (data.response ?? '').trim()
  }, [])

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      if (!window.speechSynthesis) { resolve(); return }
      speechSynthesis.cancel()
      const utter  = new SpeechSynthesisUtterance(text)
      utter.lang   = 'fr-FR'
      utter.rate   = 0.95
      utter.pitch  = 0.9
      const voices = speechSynthesis.getVoices()
      const fr     = voices.find(v => v.lang.startsWith('fr'))
      if (fr) utter.voice = fr
      utter.onend  = () => resolve()
      utter.onerror = () => resolve()
      speechSynthesis.speak(utter)
    })
  }, [])

  /* ---------- Config ---------- */
  const loadConfig = useCallback(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: { coreUrl: string; sttUrl: string }) => {
        setCoreUrlInput(data.coreUrl ?? '')
        setSttUrlInput(data.sttUrl ?? '')
      })
      .catch(() => {})
  }, [])

  const saveConfig = useCallback(() => {
    fetch('/api/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        coreUrl: coreUrlInput.trim().replace(/\/$/, ''),
        sttUrl:  sttUrlInput.trim().replace(/\/$/, ''),
      }),
    }).catch(() => {})
    setSettingsOpen(false)
  }, [coreUrlInput, sttUrlInput])

  /* ---------- Main orb handler ---------- */
  const handleOrb = useCallback(async () => {
    const state = voiceStateRef.current

    if (state === 'speaking') {
      if (window.speechSynthesis) speechSynthesis.cancel()
      setVoiceState('idle')
      stopWaveform()
      return
    }
    if (state === 'processing') return

    if (state === 'idle') {
      if (!navigator.mediaDevices?.getUserMedia) {
        addMessage('error', 'Système', 'Microphone non supporté par ce navigateur.')
        return
      }
      const started = await startRecording()
      if (!started) { addMessage('error', 'Système', 'Accès microphone refusé.'); return }
      setVoiceState('listening')
      startWaveform()
      return
    }

    if (state === 'listening') {
      setVoiceState('processing')
      stopWaveform()
      try {
        const blob = await stopRecording()
        if (!blob) { addMessage('error', 'Système', 'Enregistrement échoué.'); setVoiceState('idle'); return }

        const transcription = await sendToSTT(blob)
        if (!transcription) { addMessage('error', 'Système', 'Transcription vide.'); setVoiceState('idle'); return }

        addMessage('user', 'Vous', transcription)

        const reply = await sendToCore(transcription)
        if (!reply) { setVoiceState('idle'); return }

        addMessage('neron', 'Néron', reply)
        setVoiceState('speaking')
        await speakText(reply)
        setVoiceState('idle')
      } catch (e) {
        addMessage('error', 'Néron', e instanceof Error ? e.message : 'Erreur inconnue')
        setVoiceState('idle')
      }
    }
  }, [addMessage, setVoiceState, startRecording, startWaveform, stopRecording, stopWaveform, sendToSTT, sendToCore, speakText])

  /* ---------- Init ---------- */
  useEffect(() => {
    initWaveform()
    document.body.className = 'state-idle'
    if (window.speechSynthesis) {
      speechSynthesis.getVoices()
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices()
    }
    loadConfig()
    return () => stopWaveform()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Keyboard: Escape closes settings */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  /* ---------- Orb icon ---------- */
  function OrbIcon() {
    if (voiceState === 'processing') return <IconLoader />
    if (voiceState === 'speaking')   return <IconVolume />
    return <IconMic />
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <div className="gradient-bg" />

      <div id="app">
        {/* Header */}
        <header className={`header${hasMsgs ? ' dimmed' : ''}`}>
          <h1 className="logo">Neron</h1>
          <p className="tagline">Interface Vocale</p>
        </header>

        <main className="main">
          {/* Orb */}
          <div className="orb-section">
            <button
              className="orb-wrapper"
              onClick={handleOrb}
              aria-label="Parler à Néron"
            >
              <div className="orb-glow" />
              <div className="orb-ring ring-1" />
              <div className="orb-ring ring-2" />
              <div className="orb">
                <div className="orb-highlight" />
                <svg
                  className="orb-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <OrbIcon />
                </svg>
              </div>
            </button>

            {/* Waveform */}
            <div className="waveform" aria-hidden="true">
              <div className="waveform-bars" ref={waveformBarsRef} />
            </div>

            <p className="status-label">{STATUS[voiceState]}</p>
          </div>

          {/* Conversation */}
          <div className="conversation" ref={conversationRef} aria-live="polite">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <span className="message-label">{msg.label}</span>
                <div className="message-bubble">
                  <p className="message-text">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Settings button */}
        <button
          className="settings-btn"
          aria-label="Paramètres"
          onClick={() => { loadConfig(); setSettingsOpen(true) }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <IconSettings />
          </svg>
        </button>
      </div>

      {/* Settings modal */}
      <div
        className={`modal-overlay${settingsOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Paramètres"
        onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false) }}
      >
        <div className="modal-sheet">
          <div className="modal-header">
            <h2 className="modal-title">Configuration</h2>
            <button className="modal-close" aria-label="Fermer" onClick={() => setSettingsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="18" y1="6"  x2="6"  y2="18"/>
                <line x1="6"  y1="6"  x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="modal-field">
            <label className="field-label" htmlFor="coreUrlInput">Core URL</label>
            <input
              className="field-input"
              id="coreUrlInput"
              type="url"
              placeholder="http://localhost:8000"
              autoComplete="off"
              spellCheck={false}
              value={coreUrlInput}
              onChange={e => setCoreUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveConfig() }}
            />
          </div>

          <div className="modal-field">
            <label className="field-label" htmlFor="sttUrlInput">STT URL</label>
            <input
              className="field-input"
              id="sttUrlInput"
              type="url"
              placeholder="http://localhost:8001"
              autoComplete="off"
              spellCheck={false}
              value={sttUrlInput}
              onChange={e => setSttUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveConfig() }}
            />
          </div>

          <button className="save-btn" onClick={saveConfig}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Enregistrer
          </button>
        </div>
      </div>
    </>
  )
}
