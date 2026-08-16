import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, X, Volume2 } from 'lucide-react'
import type { VoiceLang } from '../hooks/useSettings'
import { pickVoice } from '../hooks/useTTS'

const RATE_OPTIONS = [
  { value: 0.5, label: '0.5x　とても遅い' },
  { value: 0.75, label: '0.75x　遅い' },
  { value: 0.85, label: '0.85x　やや遅い（推奨）' },
  { value: 1.0, label: '1.0x　標準' },
  { value: 1.25, label: '1.25x　速い' },
  { value: 1.5, label: '1.5x　とても速い' },
]

const VOICE_OPTIONS: { value: VoiceLang; label: string }[] = [
  { value: 'auto',  label: '自動（en-GB 優先）' },
  { value: 'en-GB', label: 'イギリス英語' },
  { value: 'en-US', label: 'アメリカ英語' },
]

const SAMPLE_TEXT = 'Hello, this is a sample sentence.'

// ── リリースノート ──────────────────────────────────────────
export const RELEASE_NOTES: { version: string; date: string; items: string[] }[] = [
  {
    version: 'v1.7',
    date: '2026-07-19',
    items: [
      '一覧からカードをタップして1枚のみ学習モードに切り替え可能に',
      'カードタップ時は枚数選択をスキップして問題画面に直遷移',
      '学習完了済みのカードもタップで直接学習可能に',
      '画像の圧縮・リサイズを廃止（元サイズのまま保存）',
    ],
  },
  {
    version: 'v1.6',
    date: '2026-07-18',
    items: [
      '画像貼り付け後に保存できない問題を修正（画像を自動圧縮するよう改善）',
    ],
  },
  {
    version: 'v1.5',
    date: '2025-07-18',
    items: [
      'Free Dictionary API によるネイティブ音声再生（イギリス英語優先）',
      '音声が見つからない場合はWeb Speech APIにフォールバック',
    ],
  },
  {
    version: 'v1.4',
    date: '2025-07-18',
    items: [
      '備考を複数追加できるように',
      '備考内の改行を反映',
      '参考画像をタップでフル画面表示',
      '学習中に1つ前の問題に戻るボタンを追加',
    ],
  },
  {
    version: 'v1.3',
    date: '2025-07-18',
    items: [
      '回答後画面にお気に入りボタンを追加',
      '回答後の読み上げを常に英語に統一',
      'アプリを閉じて再度開いたときに画面がリセットされない仕様に変更',
      '問題画面で自動読み上げ、回答画面はボタンタップのみに変更',
    ],
  },
  {
    version: 'v1.2',
    date: '2025-07-17',
    items: [
      '英語音声をイギリス英語・アメリカ英語から選択可能に',
      '読み上げ速度の設定を追加',
      '不正解カードを全問正解になるまで繰り返す学習ループ',
      '設定画面を2階層構造に変更',
    ],
  },
  {
    version: 'v1.1',
    date: '2025-07-16',
    items: [
      'プロジェクト機能（単語をグループ分け）',
      'お気に入り登録・管理',
      '回答後画面に編集ボタンを追加',
      'CSVインポート・エクスポート',
      'テキスト一括インポート',
      '複数選択・一括削除',
      '学習レベルの手動編集',
    ],
  },
  {
    version: 'v1.0',
    date: '2025-07-15',
    items: [
      '単語カードの追加・編集・削除',
      'マスタリーレベルによるスペースドリピティション',
      'Firebase クラウド同期',
      'PWA対応（ホーム画面へのインストール）',
      'オフライン動作対応',
    ],
  },
]

type Page = 'main' | 'rate' | 'voice' | 'releases'

interface Props {
  rate: number
  voiceLang: VoiceLang
  onRateChange: (r: number) => void
  onVoiceLangChange: (v: VoiceLang) => void
  onClose: () => void
}

export function SettingsModal({ rate, voiceLang, onRateChange, onVoiceLangChange, onClose }: Props) {
  const [page, setPage] = useState<Page>('main')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [playingLang, setPlayingLang] = useState<VoiceLang | null>(null)

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() ?? []
      if (v.length > 0) setVoices(v)
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  const playSample = (lang: VoiceLang) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setPlayingLang(lang)

    const utter = new SpeechSynthesisUtterance(SAMPLE_TEXT)
    utter.lang = lang === 'en-US' ? 'en-US' : 'en-GB'
    utter.rate = rate

    const voice = pickVoice(voices, lang)
    if (voice) utter.voice = voice

    utter.onend = () => setPlayingLang(null)
    utter.onerror = () => setPlayingLang(null)
    window.speechSynthesis.speak(utter)
  }

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
                {page === 'rate' ? '読み上げ速度' : page === 'voice' ? '英語音声' : 'リリースノート'}
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

        {/* メイン */}
        {page === 'main' && (
          <>
            <div className="py-2">
              <button onClick={() => setPage('rate')} className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">読み上げ速度</p>
                  <p className="text-xs text-gray-400">{rateLabel}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              <div className="mx-5 border-t" />
              <button onClick={() => setPage('voice')} className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">英語音声</p>
                  <p className="text-xs text-gray-400">{voiceLabel}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              <div className="mx-5 border-t" />
              <button onClick={() => setPage('releases')} className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">リリースノート</p>
                  <p className="text-xs text-gray-400">最新: {RELEASE_NOTES[0].version}（{RELEASE_NOTES[0].date}）</p>
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

        {/* 読み上げ速度 */}
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

        {/* 英語音声 */}
        {page === 'voice' && (
          <div className="py-2">
            {VOICE_OPTIONS.map((opt) => {
              const resolvedVoice = pickVoice(voices, opt.value)
              const isPlaying = playingLang === opt.value
              return (
                <div
                  key={opt.value}
                  className={`flex items-center justify-between px-5 py-3.5 ${voiceLang === opt.value ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <button
                    onClick={() => onVoiceLangChange(opt.value)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${voiceLang === opt.value ? 'border-indigo-600' : 'border-gray-300'}`}>
                      {voiceLang === opt.value && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                    </div>
                    <div>
                      <p className={`text-sm ${voiceLang === opt.value ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400">
                        {voices.length === 0
                          ? '音声読み込み中...'
                          : resolvedVoice
                            ? resolvedVoice.name
                            : '対応音声なし'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => playSample(opt.value)}
                    disabled={isPlaying}
                    className={`ml-3 flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                      isPlaying
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-500'
                        : 'text-gray-500 hover:bg-gray-100 disabled:opacity-30'
                    }`}
                  >
                    <Volume2 size={13} />
                    {isPlaying ? '再生中' : 'テスト'}
                  </button>
                </div>
              )
            })}
            <p className="px-5 pt-2 pb-3 text-xs text-gray-400">
              「テスト」ボタンで実際に使われる音声を確認できます
            </p>
          </div>
        )}

        {/* リリースノート */}
        {page === 'releases' && (
          <div className="max-h-[65vh] overflow-y-auto py-4">
            {RELEASE_NOTES.map((release) => (
              <div key={release.version} className="px-5 pb-5">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-indigo-700">{release.version}</span>
                  <span className="text-xs text-gray-400">{release.date}</span>
                </div>
                <ul className="space-y-1">
                  {release.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
