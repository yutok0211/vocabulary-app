import { useState, useEffect, useCallback } from 'react'
import { Volume2, ChevronLeft, RotateCcw, Check, X as XIcon, Pencil } from 'lucide-react'
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
  onResult: (id: string, result: 'correct' | 'incorrect') => void
  onUpdate: (id: string, changes: Partial<WordCard>) => void
  onBack: () => void
}

const COUNT_OPTIONS = [10, 20, 30, 50, 999]

export function StudyMode({ cards, projects, direction, rate, voiceLang, onResult, onUpdate, onBack }: Props) {
  const due = getDueCards(cards)
  const { speak } = useTTS(rate, voiceLang)

  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [queue, setQueue] = useState<WordCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  // 現ラウンドの不正解ID
  const [wrongInRound, setWrongInRound] = useState<Set<string>>(new Set())
  const [editingCard, setEditingCard] = useState<WordCard | null>(null)
  // 累計ラウンド数
  const [round, setRound] = useState(1)
  // 累計正解・不正解カウント（セッション全体）
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)

  const startStudy = useCallback(
    (count: number) => {
      const shuffled = shuffle([...due])
      setQueue(count >= due.length ? shuffled : shuffled.slice(0, count))
      setSelectedCount(count)
      setIndex(0)
      setFlipped(false)
      setDone(false)
      setWrongInRound(new Set())
      setRound(1)
      setTotalCorrect(0)
      setTotalWrong(0)
    },
    [due],
  )

  const current = queue[index]

  useEffect(() => {
    if (!current || selectedCount === null) return
    setFlipped(false)
  }, [index, current, selectedCount])

  // 英語面が表示されたとき自動読み上げ
  useEffect(() => {
    if (!current || flipped || selectedCount === null) return
    if (direction === 'en-to-ja') {
      const timer = setTimeout(() => speak(current.english, 'en'), 300)
      return () => clearTimeout(timer)
    }
  }, [index, flipped, current, direction, selectedCount, speak])

  if (due.length === 0) {
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

  // 枚数選択画面
  if (selectedCount === null) {
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
            onClick={() => startStudy(selectedCount)}
            className="flex items-center gap-2 rounded-xl border px-5 py-2.5 hover:bg-gray-50"
          >
            <RotateCcw size={16} />もう一度
          </button>
          <button onClick={onBack} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700">
            一覧へ戻る
          </button>
        </div>
      </div>
    )
  }

  const front = direction === 'ja-to-en' ? current.japanese : current.english
  const back = direction === 'ja-to-en' ? current.english : current.japanese
  const backLang = direction === 'ja-to-en' ? 'en' : 'ja'

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
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft size={20} />戻る
        </button>
        <div className="text-center text-sm text-gray-500">
          <span>{index + 1} / {queue.length}</span>
          {round > 1 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">ラウンド {round}</span>}
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
                    speak(back, backLang)
                  }}
                  className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-50"
                >
                  <Volume2 size={20} />
                </button>
              </div>
            </div>
            {current.notes && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{current.notes}</div>
            )}
            {current.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {current.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="h-28 rounded-lg border object-cover" />
                ))}
              </div>
            )}
            <div className="flex justify-end">
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
            // queue内のカードも更新
            setQueue((q) => q.map((c) => c.id === editingCard.id ? { ...c, ...changes } : c))
            setEditingCard(null)
          }}
          onClose={() => setEditingCard(null)}
        />
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
