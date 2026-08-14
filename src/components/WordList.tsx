import { useState, useRef } from 'react'
import { Plus, Search, Upload, Download, FileText, Pencil, Trash2, Volume2, CheckSquare, Heart, ChevronLeft } from 'lucide-react'
import type { WordCard, StudyDirection, Project } from '../types'
import { MasteryBadge } from './MasteryBadge'
import { CardEditor } from './CardEditor'
import { TextImport } from './TextImport'
import { TextExport } from './TextExport'
import { importFromCSV } from '../lib/csv'
import { useTTS } from '../hooks/useTTS'
import type { VoiceLang } from '../hooks/useSettings'
import { getDueCards } from '../lib/mastery'
import { getNuanceGroups } from '../lib/nuance'

interface Props {
  cards: WordCard[]
  projects: Project[]
  projectId: string | 'favorites'
  direction: StudyDirection
  rate: number
  voiceLang: VoiceLang
  onDirectionChange: (d: StudyDirection) => void
  onAdd: (partial: Partial<WordCard>) => void
  onUpdate: (id: string, changes: Partial<WordCard>) => void
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[]) => void
  onToggleFavorite: (id: string) => void
  onImport: (partials: Partial<WordCard>[]) => void
  onStudy: () => void
  onStudyNuance: () => void
  onBack: () => void
}

export function WordList({
  cards,
  projects,
  projectId,
  direction,
  rate,
  voiceLang,
  onDirectionChange,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteMany,
  onToggleFavorite,
  onImport,
  onStudy,
  onStudyNuance,
  onBack,
}: Props) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<WordCard | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showTextImport, setShowTextImport] = useState(false)
  const [showTextExport, setShowTextExport] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const csvRef = useRef<HTMLInputElement>(null)
  const { speak } = useTTS(rate, voiceLang)

  // プロジェクト/お気に入りでフィルタ
  const scopedCards =
    projectId === 'favorites'
      ? cards.filter((c) => c.isFavorite)
      : projectId === ''
      ? cards
      : cards.filter((c) => c.projectId === projectId)

  const filtered = scopedCards.filter(
    (c) =>
      c.japanese.includes(query) ||
      c.english.toLowerCase().includes(query.toLowerCase()),
  )

  const dueCount = getDueCards(scopedCards).length
  const nuanceGroupCount = getNuanceGroups(scopedCards).length
  const existingGroupIds = Array.from(new Set(cards.map((c) => c.groupId).filter(Boolean)))

  const projectName =
    projectId === 'favorites'
      ? 'お気に入り'
      : projectId === ''
      ? 'すべて'
      : (projects.find((p) => p.id === projectId)?.name ?? '')

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const partials = await importFromCSV(file)
    // プロジェクトに紐付ける
    const withProject = partials.map((p) => ({
      ...p,
      projectId: projectId === 'favorites' ? '' : projectId,
    }))
    onImport(withProject)
    e.target.value = ''
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }

  const handleBulkDelete = () => {
    onDeleteMany(Array.from(selected))
    exitSelectMode()
    setShowBulkDeleteConfirm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-800">{projectName}</h2>
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="単語を検索..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex overflow-hidden rounded-lg border text-sm">
          <button
            onClick={() => onDirectionChange('ja-to-en')}
            className={`px-3 py-2 ${direction === 'ja-to-en' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}
          >日→英</button>
          <button
            onClick={() => onDirectionChange('en-to-ja')}
            className={`px-3 py-2 ${direction === 'en-to-ja' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}
          >英→日</button>
        </div>

        {projectId !== 'favorites' && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
          >
            <Plus size={16} />追加
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowImportMenu((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            title="インポート"
          >
            <Upload size={16} />
          </button>
          {showImportMenu && (
            <div className="absolute right-0 top-10 z-10 w-44 rounded-xl border bg-white py-1 shadow-lg">
              <button
                onClick={() => { setShowTextImport(true); setShowImportMenu(false) }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <FileText size={14} />テキスト貼り付け
              </button>
              <button
                onClick={() => { csvRef.current?.click(); setShowImportMenu(false) }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
              >
                <Upload size={14} />CSVファイル
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowTextExport(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          title="エクスポート"
        >
          <Download size={16} />
        </button>

        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
      </div>

      {/* 学習開始バナー */}
      {scopedCards.length > 0 && (
        <button
          onClick={onStudy}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3.5 text-left text-white shadow hover:opacity-90"
        >
          <p className="font-semibold">学習開始</p>
          <p className="text-sm text-indigo-100">
            {dueCount > 0 ? `${dueCount} 枚が復習対象` : `全 ${scopedCards.length} 枚`}
          </p>
        </button>
      )}

      {/* ニュアンス比較モード バナー */}
      {nuanceGroupCount > 0 && (
        <button
          onClick={onStudyNuance}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-left text-white shadow hover:opacity-90"
        >
          <p className="font-semibold">ニュアンス比較モード</p>
          <p className="text-sm text-amber-100">{nuanceGroupCount} グループで出題可能</p>
        </button>
      )}

      {/* 選択モード起動 / 選択バー */}
      {selectMode ? (
        <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-indigo-700">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="accent-indigo-600" />
              全て選択
            </label>
            <span className="text-sm text-indigo-500">{selected.size} 件選択中</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              <Trash2 size={14} />{selected.size > 0 ? `${selected.size} 件削除` : '削除'}
            </button>
            <button onClick={exitSelectMode} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        filtered.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              <CheckSquare size={15} />まとめて削除
            </button>
          </div>
        )
      )}

      {/* カード一覧 */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          {scopedCards.length === 0 ? '単語を追加してください' : '検索結果なし'}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {filtered.map((card) => (
            <li
              key={card.id}
              className={`flex items-center gap-3 px-4 py-3 ${selectMode && selected.has(card.id) ? 'bg-indigo-50' : ''}`}
              onClick={selectMode ? () => toggleSelect(card.id) : undefined}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(card.id)}
                  onChange={() => toggleSelect(card.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-indigo-600 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-medium text-gray-900">{card.japanese}</span>
                  <span className="text-sm text-gray-400">→</span>
                  <span className="truncate text-sm text-gray-600">{card.english}</span>
                </div>
                <div className="mt-1">
                  <MasteryBadge level={card.masteryLevel} size="sm" />
                </div>
              </div>
              {!selectMode && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onToggleFavorite(card.id)}
                    className={`rounded-lg p-1.5 hover:bg-gray-100 ${card.isFavorite ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'}`}
                  >
                    <Heart size={16} fill={card.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => speak(card.english, 'en')}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                  >
                    <Volume2 size={16} />
                  </button>
                  <button
                    onClick={() => setEditing(card)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(card.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <CardEditor
          card={{ projectId: projectId === 'favorites' ? '' : projectId }}
          projects={projects}
          existingGroupIds={existingGroupIds}
          onSave={(changes) => onAdd(changes)}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <CardEditor
          card={editing}
          projects={projects}
          existingGroupIds={existingGroupIds}
          onSave={(changes) => onUpdate(editing.id, changes)}
          onClose={() => setEditing(null)}
        />
      )}
      {showTextImport && (
        <TextImport
          onImport={(partials) => {
            const withProject = partials.map((p) => ({
              ...p,
              projectId: projectId === 'favorites' ? '' : projectId,
            }))
            onImport(withProject)
          }}
          onClose={() => setShowTextImport(false)}
        />
      )}
      {showTextExport && <TextExport cards={scopedCards} onClose={() => setShowTextExport(false)} />}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800">カードを削除</h3>
            <p className="mt-2 text-sm text-gray-500">この操作は元に戻せません。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">キャンセル</button>
              <button onClick={() => { onDelete(deleteId); setDeleteId(null) }} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">削除</button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800">一括削除</h3>
            <p className="mt-2 text-sm text-gray-500">選択した <strong>{selected.size} 件</strong>を削除します。この操作は元に戻せません。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">キャンセル</button>
              <button onClick={handleBulkDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">{selected.size} 件削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
