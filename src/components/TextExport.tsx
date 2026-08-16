import { useState, useMemo } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { WordCard } from '../types'

interface Props {
  cards: WordCard[]
  onClose: () => void
}

type TermDelim = 'tab' | 'comma' | 'custom'
type CardDelim = 'newline' | 'semicolon' | 'custom'

export function TextExport({ cards, onClose }: Props) {
  const [termDelim, setTermDelim] = useState<TermDelim>('tab')
  const [cardDelim, setCardDelim] = useState<CardDelim>('newline')
  const [customTerm, setCustomTerm] = useState('-')
  const [customCard, setCustomCard] = useState('\\n\\n')
  const [alphabetical, setAlphabetical] = useState(false)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [copied, setCopied] = useState(false)

  const getTermChar = () => {
    if (termDelim === 'tab') return '\t'
    if (termDelim === 'comma') return ','
    return customTerm
  }

  const getCardChar = () => {
    if (cardDelim === 'newline') return '\n'
    if (cardDelim === 'semicolon') return ';'
    return customCard.replace(/\\n/g, '\n')
  }

  const output = useMemo(() => {
    const td = getTermChar()
    const cd = getCardChar()
    let sorted = [...cards]
    if (alphabetical) sorted.sort((a, b) => a.english.localeCompare(b.english))
    return sorted
      .map((c) => {
        if (includeNotes) return [c.english, c.japanese, (Array.isArray(c.notes) ? c.notes[0] : c.notes) ?? ''].join(td)
        return [c.english, c.japanese].join(td)
      })
      .join(cd)
  }, [cards, termDelim, cardDelim, customTerm, customCard, alphabetical, includeNotes])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-800">エクスポート</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-2 font-medium text-gray-700">用語と定義のあいだ</p>
              {(['tab', 'comma', 'custom'] as TermDelim[]).map((d) => (
                <label key={d} className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={termDelim === d}
                    onChange={() => setTermDelim(d)}
                    className="accent-indigo-600"
                  />
                  <span>{d === 'tab' ? 'タブ' : d === 'comma' ? 'カンマ' : 'カスタム'}</span>
                  {d === 'custom' && termDelim === 'custom' && (
                    <input
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      className="w-20 rounded border px-2 py-0.5"
                    />
                  )}
                </label>
              ))}
            </div>
            <div>
              <p className="mb-2 font-medium text-gray-700">行のあいだ</p>
              {(['newline', 'semicolon', 'custom'] as CardDelim[]).map((d) => (
                <label key={d} className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={cardDelim === d}
                    onChange={() => setCardDelim(d)}
                    className="accent-indigo-600"
                  />
                  <span>{d === 'newline' ? '改行' : d === 'semicolon' ? 'セミコロン' : 'カスタム'}</span>
                  {d === 'custom' && cardDelim === 'custom' && (
                    <input
                      value={customCard}
                      onChange={(e) => setCustomCard(e.target.value)}
                      className="w-20 rounded border px-2 py-0.5"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-gray-700">オプション</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="accent-indigo-600"
                />
                <span>備考を含める（3列目）</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={alphabetical}
                  onChange={(e) => setAlphabetical(e.target.checked)}
                  className="accent-indigo-600"
                />
                <span>アルファベット順</span>
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-gray-500">下のテキストをコピー＆ペーストしてください。このフィールドは編集不可です。</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700 shrink-0 ml-3"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'コピーしました' : 'テキストをコピー'}
              </button>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3 max-h-52 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">セットの内容</p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{output}</pre>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
