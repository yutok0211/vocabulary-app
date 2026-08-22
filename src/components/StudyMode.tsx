import { useState, useEffect, useCallback } from 'react'
import { Volume2, ChevronLeft, RotateCcw, Check, X as XIcon, Pencil, Heart } from 'lucide-react'
import type { WordCard, StudyDirection, Project } from '../types'
import { getDueCards } from '../lib/mastery'
import { MasteryBadge } from './MasteryBadge'
import { useTTS } from '../hooks/useTTS'
import type { VoiceLang } from '../hooks/useSettings'
import { CardEditor } from './CardEditor'

interface Props {
  cards: WordCard[]
  projects: Project[]
  direction: StudyDirection
  rate: number
  voiceLang: VoiceLang
  skipSelection?: boolean
  onResult: (id: string, result: 'correct' | 'incorrect') => void
  onUpdate: (id: string, changes: Partial<WordCard>) => void
  onToggleFavorite: (id: string) => void
  onBack: () => void
}

const COUNT_OPTIONS = [10, 20, 30, 50, 999]
const LS_QUEUE = 'vocab_study_queue'
const LS_INDEX = 'vocab_study_index'
const LS_FLIPPED = 'vocab_study_flipped'
const LS_COUNT = 'vocab_study_count'

function saveStudyState(queue: WordCard[], index: number, flipped: boolean, count: number | null) {
  localStorage.setItem(LS_QUEUE, JSON.stringify(queue.map((c) => c.id)))
  localStorage.setItem(LS_INDEX, String(index))
  localStorage.setItem(LS_FLIPPED, String(flipped))
  if (count !== null) localStorage.setItem(LS_COUNT, String(count))
  else localStorage.removeItem(LS_COUNT)
}

function clearStudyState() {
  localStorage.removeItem(LS_QUEUE)
  localStorage.removeItem(LS_INDEX)
  localStorage.removeItem(LS_FLIPPED)
  localStorage.removeItem(LS_COUNT)
}

export function StudyMode({ cards, projects, direction, rate, voiceLang, skipSelection, onResult, onUpdate, onToggleFavorite, onBack }: Props) {
  const due = getDueCards(cards)
  const { speak } = useTTS(rate, voiceLang)

  // リロード復元: 保存済みのキューIDからカードを再構築
  const [selectedCount, setSelectedCount] = useState<number | null>(() => {
    if (skipSelection) return cards.length
    const saved = localStorage.getItem(LS_COUNT)
    return saved !== null ? Number(saved) : null
  })
  const [queue, setQueue] = useState<WordCard[]>(() => {
    if (skipSelection) return [...cards]
    let savedIds: string[] = []
    try { savedIds = JSON.parse(localStorage.getItem(LS_QUEUE) ?? '[]') } catch { clearStudyState() }
    if (savedIds.length === 0) return []
    const cardMap = new Map(cards.map((c) => [c.id, c]))
    const restored = savedIds.map((id) => cardMap.get(id)).filter(Boolean) as WordCard[]
    return restored.length === savedIds.length ? restored : [] // 一部欠損なら初期化
  })
  const [index, setIndex] = useState(() => {
    if (skipSelection) return 0
    return Number(localStorage.getItem(LS_INDEX) ?? 0)
  })
  const [flipped, setFlipped] = useState(() => {
    if (skipSelection) return false
    return localStorage.getItem(LS_FLIPPED) === 'true'
  })
  const [done, setDone] = useState(false)
  // 現ラウンドの不正解ID
  const [wrongInRound, setWrongInRound] = useState<Set<string>>(new Set())
  const [editingCard, setEditingCard] = useState<WordCard | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  // 累計ラウンド数
  const [round, setRound] = useState(1)
  // 累計正解・不正解カウント（セッション全体）
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  // カードがロードされたらキューを再構築（リロード直後にFirestoreが遅延する場合の対策）
  useEffect(() => {
    if (cards.length === 0) return
    if (skipSelection) {
      // 単一カードタップモード: cardsが届いたらキューをセット
      if (queue.length === 0) {
        setQueue([...cards])
        setSelectedCount(cards.length)
        setIndex(0)
      }
      return
    }
    // 通常モード: localStorage からキューを復元
    if (queue.length > 0 || selectedCount === null) return
    const saved = localStorage.getItem(LS_QUEUE)
    if (!saved) return
    try {
      const savedIds: string[] = JSON.parse(saved)
      if (savedIds.length === 0) return
      const cardMap = new Map(cards.map((c) => [c.id, c]))
      const restored = savedIds.map((id) => cardMap.get(id)).filter(Boolean) as WordCard[]
      if (restored.length === savedIds.length) {
        setQueue(restored)
        setIndex(Number(localStorage.getItem(LS_INDEX) ?? 0))
        setFlipped(localStorage.getItem(LS_FLIPPED) === 'true')
      } else {
        clearStudyState()
        setSelectedCount(null)
      }
    } catch {
      clearStudyState()
      setSelectedCount(null)
    }
  }, [cards]) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変化のたびに保存
  useEffect(() => {
    if (queue.length > 0 && selectedCount !== null) {
      saveStudyState(queue, index, flipped, selectedCount)
    }
  }, [queue, index, flipped, selectedCount])

  const startStudy = useCallback(
    (count: number) => {
      const shuffled = shuffle([...due])
      const newQueue = count >= due.length ? shuffled : shuffled.slice(0, count)
      setQueue(newQueue)
      setSelectedCount(count)
      setIndex(0)
      setFlipped(false)
      setDone(false)
      setWrongInRound(new Set())
      setRound(1)
      setTotalCorrect(0)
      setTotalWrong(0)
      saveStudyState(newQueue, 0, false, count)
    },
    [due],
  )

  const current = queue[index] ?? null

  useEffect(() => {
    if (selectedCount === null) return
    setFlipped(false)
  }, [index, selectedCount])

  // 問題面表示時に自動読み上げ（indexが変わるたびに問題面なので flipped チェック不要）
  useEffect(() => {
    if (!current || selectedCount === null) return
    const text = direction === 'en-to-ja' ? current.english : current.japanese
    const lang = direction === 'en-to-ja' ? 'en' : 'ja'
    const timer = setTimeout(() => speak(text, lang), 300)
    return () => clearTimeout(timer)
  }, [index, selectedCount]) // eslint-disable-line react-hooks/exhaustive-deps


  // カードロード待ち（Firestore遅延 or キュー復元中）- due.length===0チェックより先に実施
  if (cards.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!skipSelection && due.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800">今日の学習は完了！</h2>
        <p className="text-gray-500">次の復習予定まで休憩しましょう</p>
        <button onClick={onBack} className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700">
          一覧へ戻る
        </button>
      </div>
    )
  }

  // キュー復元待ち
  if (selectedCount !== null && !done && current === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  // 枚数選択画面
  if (!skipSelection && selectedCount === null) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
            <ChevronLeft size={20} />戻る
          </button>
        </div>
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-xl font-bold text-gray-800">学習を開始する</h2>
          <p className="mb-6 text-sm text-gray-400">復習対象: {due.length} 枚</p>
          <p className="mb-3 text-sm font-medium text-gray-700">出題数を選択</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {COUNT_OPTIONS.map((n) => {
              const actual = Math.min(n, due.length)
              const label = n >= 999 ? `すべて (${due.length})` : `${actual}枚`
              const disabled = n < 999 && due.length < n
              return (
                <button
                  key={n}
                  onClick={() => startStudy(n)}
                  disabled={disabled}
                  className="rounded-xl border-2 border-indigo-200 bg-indigo-50 py-3 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-30"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800">セッション完了！</h2>
        <p className="text-gray-500">
          正解 {totalCorrect} 回 / 不正解 {totalWrong} 回（{round} ラウンド）
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => startStudy(selectedCount ?? due.length)}
            className="flex items-center gap-2 rounded-xl border px-5 py-2.5 hover:bg-gray-50"
          >
            <RotateCcw size={16} />もう一度
          </button>
          <button onClick={() => { clearStudyState(); onBack() }} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700">
            一覧へ戻る
          </button>
        </div>
      </div>
    )
  }

  const front = direction === 'ja-to-en' ? current.japanese : current.english
  const back = direction === 'ja-to-en' ? current.english : current.japanese

  const handleResult = (result: 'correct' | 'incorrect') => {
    onResult(current.id, result)

    const newWrong = new Set(wrongInRound)
    if (result === 'incorrect') {
      newWrong.add(current.id)
      setTotalWrong((n) => n + 1)
    } else {
      setTotalCorrect((n) => n + 1)
    }
    setWrongInRound(newWrong)

    if (index + 1 >= queue.length) {
      // ラウンド終了
      if (newWrong.size > 0) {
        // 不正解カードを再キューしてもう1ラウンド
        const wrongCards = queue.filter((c) => newWrong.has(c.id))
        setQueue(shuffle(wrongCards))
        setIndex(0)
        setFlipped(false)
        setWrongInRound(new Set())
        setRound((r) => r + 1)
      } else {
        clearStudyState()
        setDone(true)
      }
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button onClick={() => { clearStudyState(); onBack() }} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft size={20} />戻る
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {index > 0 && (
            <button
              onClick={() => { setIndex((i) => i - 1); setFlipped(false) }}
              className="flex items-center gap-0.5 rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
            >
              <ChevronLeft size={14} />前へ
            </button>
          )}
          <span>{index + 1} / {queue.length}</span>
          {round > 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">ラウンド {round}</span>}
        </div>
        <MasteryBadge level={current.masteryLevel} size="sm" />
      </div>

      {/* 進捗バー */}
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>

      {/* カード */}
      <div
        className="relative min-h-64 cursor-pointer rounded-2xl border-2 border-indigo-100 bg-white p-8 shadow-lg transition-shadow hover:shadow-xl"
        onClick={() => !flipped && setFlipped(true)}
      >
        {!flipped ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-center text-3xl font-bold text-gray-800">{front}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  speak(front, direction === 'en-to-ja' ? 'en' : 'ja')
                }}
                className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-600 hover:bg-indigo-100"
              >
                <Volume2 size={16} />もう一度聴く
              </button>
              <p className="text-sm text-gray-400">カードをタップで答え確認</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="mb-1 text-sm text-gray-400">{front}</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-bold text-indigo-700">{back}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speak(current.english, 'en')
                  }}
                  className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-50"
                >
                  <Volume2 size={20} />
                </button>
              </div>
            </div>
            {current.notes.length > 0 && (
              <div className="space-y-2">
                {current.notes.map((note, i) => note.trim() && (
                  <div key={i} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 whitespace-pre-wrap">{note}</div>
                ))}
              </div>
            )}
            {current.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {current.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-28 rounded-lg border object-cover cursor-pointer hover:opacity-90"
                    onClick={(e) => { e.stopPropagation(); setLightboxSrc(src) }}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(current.id)
                  setQueue((q) => q.map((c) => c.id === current.id ? { ...c, isFavorite: !c.isFavorite } : c))
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  current.isFavorite
                    ? 'border-pink-300 bg-pink-50 text-pink-600'
                    : 'border-gray-200 text-gray-400 hover:bg-pink-50 hover:text-pink-500'
                }`}
              >
                <Heart size={14} fill={current.isFavorite ? 'currentColor' : 'none'} />
                {current.isFavorite ? 'お気に入り済' : 'お気に入り'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingCard(current) }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
              >
                <Pencil size={14} />編集
              </button>
            </div>
          </div>
        )}
      </div>

      {editingCard && (
        <CardEditor
          card={editingCard}
          projects={projects}
          existingGroupIds={Array.from(new Set(cards.map((c) => c.groupId).filter(Boolean)))}
          onSave={(changes) => {
            onUpdate(editingCard.id, changes)
            setEditingCard(null)
          }}
          onClose={() => setEditingCard(null)}
        />
      )}

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <XIcon size={24} />
          </button>
        </div>
      )}

      {/* 結果ボタン */}
      {flipped && (
        <div className="flex gap-4">
          <button
            onClick={() => handleResult('incorrect')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3 font-semibold text-red-700 hover:bg-red-100"
          >
            <XIcon size={20} />不正解
          </button>
          <button
            onClick={() => handleResult('correct')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 py-3 font-semibold text-green-700 hover:bg-green-100"
          >
            <Check size={20} />正解
          </button>
        </div>
      )}
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
