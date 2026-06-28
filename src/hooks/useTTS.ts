import { useCallback, useEffect, useRef } from 'react'
import type { VoiceLang } from './useSettings'

function pickVoice(voices: SpeechSynthesisVoice[], voiceLang: VoiceLang): SpeechSynthesisVoice | undefined {
  if (voiceLang === 'en-GB') {
    return (
      voices.find((v) => v.lang === 'en-GB') ??
      voices.find((v) => v.lang.startsWith('en-GB'))
    )
  }
  if (voiceLang === 'en-US') {
    return (
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.startsWith('en-US'))
    )
  }
  // auto: en-GB 優先
  return (
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en-GB')) ??
    voices.find((v) => v.lang === 'en-AU') ??
    voices.find((v) => v.lang.startsWith('en-AU'))
  )
}

export function useTTS(rate: number = 0.85, voiceLang: VoiceLang = 'auto') {
  // ref で常に最新値を保持 → speak のクロージャが古くならない
  const rateRef = useRef(rate)
  const voiceLangRef = useRef(voiceLang)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => { voiceLangRef.current = voiceLang }, [voiceLang])

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() ?? []
      if (v.length > 0) voicesRef.current = v
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  // speak は依存配列なし → 参照が安定し、常に最新の ref 値を使う
  const speak = useCallback((text: string, lang: 'en' | 'ja' = 'en') => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const voices =
      voicesRef.current.length > 0
        ? voicesRef.current
        : window.speechSynthesis.getVoices()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang === 'en' ? 'en-GB' : 'ja-JP'
    utter.rate = rateRef.current

    if (lang === 'en') {
      const voice = pickVoice(voices, voiceLangRef.current)
      if (voice) utter.voice = voice
    }

    window.speechSynthesis.speak(utter)
  }, []) // 依存なし — ref 経由で最新値を参照

  const stop = useCallback(() => window.speechSynthesis?.cancel(), [])

  return { speak, stop }
}
