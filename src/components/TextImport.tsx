import { useState } from 'react'
import { X } from 'lucide-react'
import type { WordCard } from '../types'

interface Props {
  onImport: (partials: Partial<WordCard>[]) => void
  onClose: () => void
}

type TermDelim = 'tab' | 'comma' | 'custom'
type CardDelim = 'newline' | 'semicolon' | 'custom'

export function TextImport({ onImport, onClose }: Props) {
  const [text, setText] = useState('')
  const [termDelim, setTermDelim] = useState<TermDelim>('tab')
  const [cardDelim, setCardDelim] = useState<CardDelim>('newline')
  const [customTerm, setCustomTerm] = useState('')
  const [customCard, setCustomCard] = useState('')
  const [swapColumns, setSwapColumns] = useState(false)

  const getTermChar = () => {
    if (termDelim === 'tab') return '\t'
    if (termDelim === 'comma') return ','
    return customTerm
  }

  const getCardChar = () => {
    if (cardDelim === 'newline') return '\n'
    if (cardDelim === 'semicolon') return ';'
    return customCard
  }

  // Tabキーをテキストエリア内でタブ文字として入力できるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = ta.value.substring(0, start) + '\t' + ta.value.substring(end)
      setText(newVal)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1
      })
    }
  }

  // 貼り付け時に区切り文字を自動検出
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes('\t')) {
      setTermDelim('tab')
    } else if (pasted.includes(',')) {
      setTermDelim('comma')
    }
    // cardDelim は改行でほぼ確定
    setCardDelim('newline')
  }

  const parseCards = (): Partial<WordCard>[] => {
    const td = getTermChar()
    const cd = getCardChar()
    if (!td || !cd || !text.trim()) return []
    return text
      .trim()
      .split(cd)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(td)
        const col0 = parts[0]?.trim() ?? ''
        const col1 = parts[1]?.trim() ?? ''
        const col2 = parts[2]?.trim() ?? ''
        return {
          english: swapColumns ? col1 : col0,
          japanese: swapColumns ? col0 : col1,
          notes: col2,
          images: [],
        }
      })
      .filter((c) => c.english || c.japanese)
  }

  const preview = parseCards()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-800">データをインポートする</h2>
            <p className="text-xs text-gray-400">
              Word・Excel・Google Docsからコピペ可。PCではTabキーでタブ入力できます。
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="h-44 w-full rounded-lg border p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={'（例: 英語[Tab]日本語[Tab]備考）\napple\tりんご\tリンゴ科の果物\ndog\t犬\n\n3列目は備考として取り込まれます。\nExcelからコピーすると区切り文字が自動検出されます。'}
          />

          {/* 列の割り当て */}
          <div className="rounded-lg border bg-gray-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">列の割り当て</p>
            <div className="flex gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={!swapColumns} onChange={() => setSwapColumns(false)} className="accent-indigo-600" />
                <span>1列目 = <strong>英語</strong>　2列目 = 日本語</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={swapColumns} onChange={() => setSwapColumns(true)} className="accent-indigo-600" />
                <span>1列目 = <strong>日本語</strong>　2列目 = 英語</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
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
                  <span>{d === 'tab' ? 'Tab' : d === 'comma' ? 'カンマ' : 'カスタム'}</span>
                  {d === 'custom' && termDelim === 'custom' && (
                    <input
                      value={customTerm}
                      onChange={(e) => setCustomTerm(e.target.value)}
                      className="w-20 rounded border px-2 py-0.5 text-sm"
                      placeholder="-"
                    />
                  )}
                </label>
              ))}
            </div>
            <div>
              <p className="mb-2 font-medium text-gray-700">カードのあいだ</p>
              {(['newline', 'semicolon', 'custom'] as CardDelim[]).map((d) => (
                <label key={d} className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={cardDelim === d}
                    onChange={() => setCardDelim(d)}
                    className="accent-indigo-600"
                  />
                  <span>
                    {d === 'newline' ? '改行' : d === 'semicolon' ? 'セミコロン' : 'カスタム'}
                  </span>
                  {d === 'custom' && cardDelim === 'custom' && (
                    <input
                      value={customCard}
                      onChange={(e) => setCustomCard(e.target.value)}
                      className="w-20 rounded border px-2 py-0.5 text-sm"
                      placeholder="\\n\\n"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              プレビュー{' '}
              <span className="font-normal text-gray-400">{preview.length}枚のカード</span>
            </p>
            {preview.length === 0 ? (
              <p className="text-sm text-gray-400">まだプレビューするものがありません。</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-gray-50 p-3">
                {preview.slice(0, 15).map((c, i) => (
                  <div key={i} className="border-b py-1 text-sm last:border-0">
                    <span className="font-medium text-gray-800">{c.english}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-gray-600">{c.japanese}</span>
                    {c.notes && (
                      <span className="ml-2 text-xs text-amber-600">[備考: {c.notes}]</span>
                    )}
                  </div>
                ))}
                {preview.length > 15 && (
                  <p className="mt-1 text-xs text-gray-400">他 {preview.length - 15} 枚...</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            キャンセル
          </button>
          <button
            onClick={() => {
              onImport(preview)
              onClose()
            }}
            disabled={preview.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {preview.length}枚をインポート
          </button>
        </div>
      </div>
    </div>
  )
}
