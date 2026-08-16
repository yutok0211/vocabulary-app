import { useCallback, useEffect, useRef } from 'react'
import type { VoiceLang } from './useSettings'

export function pickVoice(voices: SpeechSynthesisVoice[], voiceLang: VoiceLang): SpeechSynthesisVoice | undefined {
  if (voiceLang === 'en-GB') {
    return (
      voices.find((v) => v.lang === 'en-GB') ??
      voices.find((v) => v.lang.startsWith('en-GB')) ??
      voices.find((v) => /uk|british|united kingdom/i.test(v.name))
    )
  }
  if (voiceLang === 'en-US') {
    return (
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.startsWith('en-US')) ??
      voices.find((v) => /american|united states/i.test(v.name))
    )
  }
  // auto: en-GB 優先
  return (
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en-GB')) ??
    voices.find((v) => /uk|british/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-AU') ??
    voices.find((v) => v.lang.startsWith('en-AU'))
  )
}

// ── Dictionary API ───────────────────────────────────────────
// セッション中のキャッシュ（word → mp3 URL or null）
const audioCache = new Map<string, string | null>()

async function fetchDictionaryAudio(word: string, preferUK: boolean): Promise<string | null> {
  const key = `${word}:${preferUK}`
  if (audioCache.has(key)) return audioCache.get(key)!

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!res.ok) { audioCache.set(key, null); return null }

    const data = await res.json()
    const phonetics: { audio?: string }[] = data?.[0]?.phonetics ?? []
    const withAudio = phonetics.filter((p) => p.audio)

    let url: string | null = null
    if (preferUK) {
      // UK優先: URLに "uk" を含むもの
      url = withAudio.find((p) => /\-uk\b|\buk\b|gb/i.test(p.audio!))?.audio ?? null
      // なければ US 以外の最初のもの
      if (!url) url = withAudio.find((p) => !/\-us\b|\bus\b/i.test(p.audio!))?.audio ?? null
    }
    // それでもなければ最初の音声
    if (!url) url = withAudio[0]?.audio ?? null

    audioCache.set(key, url)
    return url
  } catch {
    audioCache.set(key, null)
    return null
  }
}

// ── TTS fallback (Web Speech API) ───────────────────────────
function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const immediate = window.speechSynthesis.getVoices()
    if (immediate.length > 0) { resolve(immediate); return }
    const handler = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        resolve(v)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      resolve(window.speechSynthesis.getVoices())
    }, 3000)
  })
}

function speakWithTTS(text: string, lang: 'en' | 'ja', rate: number, voiceLang: VoiceLang) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  getVoicesReady().then((voices) => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang === 'en' ? 'en-GB' : 'ja-JP'
    utter.rate = rate
    if (lang === 'en') {
      const voice = pickVoice(voices, voiceLang)
      if (voice) utter.voice = voice
    }
    window.speechSynthesis.speak(utter)
  })
}

// ── Hook ────────────────────────────────────────────────────
export function useTTS(rate: number = 0.85, voiceLang: VoiceLang = 'auto') {
  const rateRef = useRef(rate)
  const voiceLangRef = useRef(voiceLang)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => { voiceLangRef.current = voiceLang }, [voiceLang])

  const speak = useCallback((text: string, lang: 'en' | 'ja' = 'en') => {
    // 再生中の音声を停止
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis?.cancel()

    if (lang === 'en') {
      // 単語1つだけのときDictionary APIを試みる（スペースなし）
      const singleWord = text.trim().split(/\s+/).length <= 3
      if (singleWord) {
        const preferUK = voiceLangRef.current !== 'en-US'
        fetchDictionaryAudio(text.trim(), preferUK).then((url) => {
          if (url) {
            const audio = new Audio(url)
            audio.playbackRate = rateRef.current
            audioRef.current = audio
            audio.play().catch(() => {
              // mp3再生失敗時はTTSにフォールバック
              speakWithTTS(text, lang, rateRef.current, voiceLangRef.current)
            })
          } else {
            speakWithTTS(text, lang, rateRef.current, voiceLangRef.current)
          }
        })
        return
      }
    }

    speakWithTTS(text, lang, rateRef.current, voiceLangRef.current)
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis?.cancel()
  }, [])

  return { speak, stop }
}
