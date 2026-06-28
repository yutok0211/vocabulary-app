import { useState, useEffect } from 'react'
import type { StudyDirection } from '../types'

export type VoiceLang = 'auto' | 'en-US' | 'en-GB'

interface Settings {
  rate: number
  direction: StudyDirection
  voiceLang: VoiceLang
}

const KEY = 'vocab_settings'
const DEFAULTS: Settings = { rate: 0.85, direction: 'en-to-ja', voiceLang: 'auto' }

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])

  const setRate = (rate: number) => setSettings((s) => ({ ...s, rate }))
  const setDirection = (direction: StudyDirection) => setSettings((s) => ({ ...s, direction }))
  const setVoiceLang = (voiceLang: VoiceLang) => setSettings((s) => ({ ...s, voiceLang }))

  return { ...settings, setRate, setDirection, setVoiceLang }
}
