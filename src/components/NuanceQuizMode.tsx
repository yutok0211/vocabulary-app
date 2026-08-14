import { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, RotateCcw, Volume2 } from 'lucide-react'
import type { WordCard, StudyResult } from '../types'
import { getNuanceGroups, getNuanceQuizCards, blankSentence } from '../lib/nuance'
import { useTTS } from '../hooks/useTTS'
import type { VoiceLang } from '../hooks/useSettings'

interface Props {
  cards: WordCard[]
  rate: number
  voiceLang: VoiceLang
  onResult: (id: string, result: StudyResult) => void
  onBack: () => void
}

interface Question {
  card: WordCard
  options: WordCard[] // 同グループのカード（シャッフル済み）
}

const COUNT_OPTIONS = [10, 20, 30, 999]

export function NuanceQuizMode({ cards, rate, voiceLang, onResult, onBack }: Props) {
  const { speak } = useTTS(rate, voiceLang)
  const groups = useMemo(() => getNuanceGroups(cards), [cards])
  const quizCards = useMemo(() => getNuanceQuizCards(cards), [cards])
  const groupById = useMemo(() => {
    const m = new Map<string, WordCard[]>()
    groups.forEach((g) => m.set(g.groupId, g.cards))
    return m
  }, [groups])

  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [queue, setQueue] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [wrongInRound, setWrongInRound] = useState<Set<string>>(new Set())
  const [round, setRound] = useState(1)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [done, setDone] = useState(false)

  const buildQuestion = useCallback(
    (card: WordCard): Question => ({
      card,
      options: shuffle([...(groupById.get(card.groupId) ?? [card])]),
    }),
    [groupById],
  )

  const startQuiz = useCallback(
    (count: number) => {
      const shuffled = shuffle([...quizCards])
      const picked = count >= shuffled.length ? shuffled : shuffled.slice(0, count)
      setQueue(picked.map(buildQuestion))
      setSelectedCount(count)
      setIndex(0)
      setSelected(null)
      setAnswered(false)
      setDone(false)
      setWrongInRound(new Set())
      setRound(1)
      setTotalCorrect(0)
      setTotalWrong(0)
    },
    [quizCards, buildQuestion],
  )

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-2xl font-bold text-gray-800">グループが設定されたカードがありません</h2>
        <p className="max-w-sm text-sm text-gray-500">
          カード編集で「グループ名」（例: delicious系）と「強度ランク」を同じグループの2枚以上のカードに設定すると、ニュアンス比較モードが利用できます。
        </p>
        <button onClick={onBack} className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700">
          一覧へ戻る
        </button>
      </div>
    )
  }

  if (quizCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-5xl">✍️</div>
        <h2 className="text-2xl font-bold text-gray-800">シチュエーション文が未設定です</h2>
        <p className="max-w-sm text-sm text-gray-500">
          グループ済みのカードに「シチュエーション文」（対象の単語を含む例文）を設定すると出題されます。
        </p>
        <button onClick={onBack} className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700">
          一覧へ戻る
        </button>
      </div>
    )
  }

  // 出題数選択画面
  if (selectedCount === null) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
            <ChevronLeft size={20} />戻る
          </button>
        </div>
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-xl font-bold text-gray-800">ニュアンス比較モード</h2>
          <p className="mb-6 text-sm text-gray-400">
            出題可能: {quizCards.length} 問（{groups.length} グループ）
          </p>
          <p className="mb-3 text-sm font-medium text-gray-700">出題数を選択</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COUNT_OPTIONS.map((n) => {
              const actual = Math.min(n, quizCards.length)
              const label = n >= 999 ? `すべて (${quizCards.length})` : `${actual}問`
              const disabled = n < 999 && quizCards.length < n
              return (
                <button
                  key={n}
                  onClick={() => startQuiz(n)}
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
            onClick={() => startQuiz(selectedCount)}
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

  const { card, options } = queue[index]
  const blanked = blankSentence(card.exampleSentence, card.english)

  const handleSelect = (optionId: string) => {
    if (answered) return
    setSelected(optionId)
    setAnswered(true)
    const correct = optionId === card.id
    onResult(card.id, correct ? 'correct' : 'incorrect')
    if (correct) {
      setTotalCorrect((n) => n + 1)
    } else {
      setTotalWrong((n) => n + 1)
      setWrongInRound((prev) => new Set(prev).add(card.id))
    }
  }

  const handleNext = () => {
    if (index + 1 >= queue.length) {
      if (wrongInRound.size > 0) {
        const wrongCards = queue.filter((q) => wrongInRound.has(q.card.id)).map((q) => q.card)
        setQueue(shuffle(wrongCards).map(buildQuestion))
        setIndex(0)
        setWrongInRound(new Set())
        setRound((r) => r + 1)
      } else {
        setDone(true)
      }
    } else {
      setIndex((i) => i + 1)
    }
    setSelected(null)
    setAnswered(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft size={20} />戻る
        </button>
        <div className="text-center text-sm text-gray-500">
          <span>{index + 1} / {queue.length}</span>
          {round > 1 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">ラウンド {round}</span>
          )}
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">{card.groupId}</span>
      </div>

      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-lg">
        <p className="mb-1 text-xs font-medium text-gray-400">シチュエーション</p>
        <p className="text-xl font-semibold leading-relaxed text-gray-800">{blanked}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const isCorrect = opt.id === card.id
          const isSelected = opt.id === selected
          let style = 'border-gray-200 hover:bg-gray-50'
          if (answered) {
            if (isCorrect) style = 'border-green-400 bg-green-50 text-green-800'
            else if (isSelected) style = 'border-red-400 bg-red-50 text-red-800'
            else style = 'border-gray-100 text-gray-400'
          }
          return (
            <button
              key={opt.id}
              disabled={answered}
              onClick={() => handleSelect(opt.id)}
              className={`rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-colors ${style}`}
            >
              {opt.english}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="rounded-xl bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              正解: <span className="text-indigo-700">{card.english}</span>（{card.japanese}）
            </p>
            <button onClick={() => speak(card.english, 'en')} className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-100">
              <Volume2 size={18} />
            </button>
          </div>
          {card.notes && <p className="mb-3 text-sm text-amber-700">{card.notes}</p>}
          <div className="flex flex-wrap gap-1.5">
            {(groupById.get(card.groupId) ?? []).map((c) => (
              <span
                key={c.id}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  c.id === card.id ? 'bg-indigo-600 text-white' : 'border bg-white text-gray-500'
                }`}
              >
                {c.english}
              </span>
            ))}
          </div>
          <button
            onClick={handleNext}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            次へ
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
