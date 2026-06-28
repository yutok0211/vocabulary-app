import { useState, useRef } from 'react'
import { X, Image, Trash2 } from 'lucide-react'
import type { WordCard, Project } from '../types'
import { getMasteryLabel, getMasteryColor } from '../lib/mastery'
import { MASTERY_INTERVALS } from '../types'

interface Props {
  card: Partial<WordCard>
  projects: Project[]
  onSave: (changes: Partial<WordCard>) => void
  onClose: () => void
}

export function CardEditor({ card, projects, onSave, onClose }: Props) {
  const [japanese, setJapanese] = useState(card.japanese ?? '')
  const [english, setEnglish] = useState(card.english ?? '')
  const [notes, setNotes] = useState(card.notes ?? '')
  const [images, setImages] = useState<string[]>(card.images ?? [])
  const [masteryLevel, setMasteryLevel] = useState<number>(card.masteryLevel ?? 0)
  const [projectId, setProjectId] = useState<string>(card.projectId ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target!.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    Array.from(e.clipboardData.items).forEach((item) => {
      if (!item.type.startsWith('image/')) return
      const file = item.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target!.result as string])
      reader.readAsDataURL(file)
    })
  }

  const handleSave = () => {
    if (!japanese.trim() || !english.trim()) return
    const intervalDays = MASTERY_INTERVALS[masteryLevel] ?? 0
    const nextReviewDate =
      intervalDays === 0
        ? new Date().toISOString()
        : (() => { const d = new Date(); d.setDate(d.getDate() + intervalDays); return d.toISOString() })()
    onSave({ japanese: japanese.trim(), english: english.trim(), notes, images, masteryLevel, nextReviewDate, projectId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onPaste={handlePaste}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {card.id ? 'カードを編集' : 'カードを追加'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">日本語</label>
            <input
              value={japanese}
              onChange={(e) => setJapanese(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例: りんご"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">英語</label>
            <input
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例: apple"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">備考・解説</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例文、語源、覚え方など..."
            />
          </div>

          {/* プロジェクト */}
          {projects.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">プロジェクト</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">未分類</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 学習レベル（編集時のみ） */}
          {card.id !== undefined && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">学習レベル</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setMasteryLevel(lv)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      masteryLevel === lv
                        ? getMasteryColor(lv) + ' border-transparent ring-2 ring-offset-1 ring-indigo-400'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {getMasteryLabel(lv)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                次回復習: {MASTERY_INTERVALS[masteryLevel] === 0 ? '今すぐ' : `${MASTERY_INTERVALS[masteryLevel]}日後`}
              </p>
            </div>
          )}

          {/* 画像 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">画像</label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <Image size={14} />追加
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="group relative">
                    <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover border" />
                    <button
                      onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-red-500 p-0.5 text-white group-hover:flex"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">画像はクリップボードから貼り付け（Ctrl+V）も可能</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!japanese.trim() || !english.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
