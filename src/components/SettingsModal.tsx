import { useState } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import type { VoiceLang } from '../hooks/useSettings'

const RATE_OPTIONS = [
  { value: 0.5, label: '0.5x　とても遅い' },
  { value: 0.75, label: '0.75x　遅い' },
  { value: 0.85, label: '0.85x　やや遅い（推奨）' },
  { value: 1.0, label: '1.0x　標準' },
  { value: 1.25, label: '1.25x　速い' },
  { value: 1.5, label: '1.5x　とても速い' },
]

const VOICE_OPTIONS: { value: VoiceLang; label: string; sub: string }[] = [
  { value: 'auto', label: '自動', sub: 'en-GB → en-AU の順で選択' },
  { value: 'en-GB', label: 'イギリス英語', sub: 'en-GB' },
  { value: 'en-US', label: 'アメリカ英語', sub: 'en-US' },
]

type Page = 'main' | 'rate' | 'voice'

interface Props {
  rate: number
  voiceLang: VoiceLang
  onRateChange: (r: number) => void
  onVoiceLangChange: (v: VoiceLang) => void
  onClose: () => void
}

export function SettingsModal({ rate, voiceLang, onRateChange, onVoiceLangChange, onClose }: Props) {
  const [page, setPage] = useState<Page>('main')

  const rateLabel = RATE_OPTIONS.find((o) => o.value === rate)?.label ?? ''
  const voiceLabel = VOICE_OPTIONS.find((o) => o.value === voiceLang)?.label ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center border-b px-4 py-4">
          {page !== 'main' ? (
            <>
              <button onClick={() => setPage('main')} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
                <ChevronLeft size={20} />戻る
              </button>
              <span className="mx-auto font-semibold text-gray-800">
                {page === 'rate' ? '読み上げ速度' : '英語音声'}
              </span>
              <div className="w-12" />
            </>
          ) : (
            <>
              <h2 className="font-semibold text-gray-800">設定</h2>
              <button onClick={onClose} className="ml-auto rounded-lg p-1 hover:bg-gray-100">
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {/* メイン画面 */}
        {page === 'main' && (
          <>
            <div className="py-2">
              <button
                onClick={() => setPage('rate')}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">読み上げ速度</p>
                  <p className="text-xs text-gray-400">{rateLabel}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              <div className="mx-5 border-t" />
              <button
                onClick={() => setPage('voice')}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">英語音声</p>
                  <p className="text-xs text-gray-400">{voiceLabel}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <button onClick={onClose} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                閉じる
              </button>
            </div>
          </>
        )}

        {/* 読み上げ速度サブ画面 */}
        {page === 'rate' && (
          <div className="py-2">
            {RATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onRateChange(opt.value)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50"
              >
                <span className={`text-sm ${rate === opt.value ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                {rate === opt.value && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>
        )}

        {/* 英語音声サブ画面 */}
        {page === 'voice' && (
          <div className="py-2">
            {VOICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onVoiceLangChange(opt.value)}
                className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50"
              >
                <div className="text-left">
                  <p className={`text-sm ${voiceLang === opt.value ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400">{opt.sub}</p>
                </div>
                {voiceLang === opt.value && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
