import { useState } from 'react'
import { Plus, Pencil, Trash2, Heart, BookOpen, Layers, ChevronLeft } from 'lucide-react'
import type { Project, WordCard, AppMode, StudyDirection } from '../types'
import { getDueCards } from '../lib/mastery'

interface Props {
  projects: Project[]
  cards: WordCard[]
  mode: AppMode
  onSelectProject: (projectId: string | 'favorites') => void
  onAddProject: (name: string) => void
  onUpdateProject: (id: string, changes: Partial<Pick<Project, 'name' | 'direction'>>) => void
  onDeleteProject: (id: string) => void
  onBack: () => void
}

export function ProjectList({
  projects,
  cards,
  mode,
  onSelectProject,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onBack,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [addingName, setAddingName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const allDue = getDueCards(cards).length
  const favCards = cards.filter((c) => c.isFavorite)
  const favDue = getDueCards(favCards).length

  const projectStats = (projectId: string) => {
    const pc = cards.filter((c) => c.projectId === projectId)
    return { total: pc.length, due: getDueCards(pc).length }
  }

  const handleAdd = () => {
    if (!addingName.trim()) return
    onAddProject(addingName.trim())
    setAddingName('')
    setShowAdd(false)
  }

  const handleUpdate = () => {
    if (!editingId || !editingName.trim()) return
    onUpdateProject(editingId, { name: editingName.trim() })
    setEditingId(null)
  }

  const toggleDirection = (p: Project) => {
    const next: StudyDirection = (p.direction ?? 'ja-to-en') === 'ja-to-en' ? 'en-to-ja' : 'ja-to-en'
    onUpdateProject(p.id, { direction: next })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft size={20} />
        </button>
        <h2 className="flex-1 text-lg font-bold text-gray-800">
          プロジェクト
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 align-middle text-xs font-medium text-gray-500">
            {mode === 'flashcard' ? '単語カード学習' : 'ニュアンス比較モード'}
          </span>
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
        >
          <Plus size={15} />追加
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={addingName}
            onChange={(e) => setAddingName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
            placeholder="プロジェクト名"
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={handleAdd} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">作成</button>
          <button onClick={() => setShowAdd(false)} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">×</button>
        </div>
      )}

      <div className="space-y-2">
        {/* すべて */}
        <button
          onClick={() => onSelectProject('')}
          className="flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Layers size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800">すべて</p>
            <p className="text-xs text-gray-400">{cards.length} 枚{allDue > 0 && ` • ${allDue} 枚復習待ち`}</p>
          </div>
        </button>

        {/* お気に入り */}
        <button
          onClick={() => onSelectProject('favorites')}
          className="flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-500">
            <Heart size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800">お気に入り</p>
            <p className="text-xs text-gray-400">{favCards.length} 枚{favDue > 0 && ` • ${favDue} 枚復習待ち`}</p>
          </div>
        </button>

        {/* 各プロジェクト */}
        {projects.map((p) => {
          const stats = projectStats(p.id)
          return (
            <div key={p.id} className="flex items-center gap-2">
              {editingId === p.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={handleUpdate} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">保存</button>
                  <button onClick={() => setEditingId(null)} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">×</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectProject(p.id)}
                    className="flex flex-1 items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm hover:bg-gray-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{stats.total} 枚{stats.due > 0 && ` • ${stats.due} 枚復習待ち`}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleDirection(p) }}
                    className="shrink-0 rounded-lg border px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                    title="出題方向を切り替え"
                  >
                    {(p.direction ?? 'ja-to-en') === 'ja-to-en' ? '日→英' : '英→日'}
                  </button>
                  <button
                    onClick={() => { setEditingId(p.id); setEditingName(p.name) }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800">プロジェクトを削除</h3>
            <p className="mt-2 text-sm text-gray-500">プロジェクトのみ削除されます。カードは「すべて」に残ります。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">キャンセル</button>
              <button
                onClick={() => { onDeleteProject(deleteId); setDeleteId(null) }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
