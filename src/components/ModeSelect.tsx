import { BookOpen } from 'lucide-react'
import type { AppMode } from '../types'

interface Props {
  onSelect: (mode: AppMode) => void
}

export function ModeSelect({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">学習モードを選択</h2>
      <div className="grid gap-4">
        <button
          onClick={() => onSelect('flashcard')}
          className="flex flex-col items-start gap-3 rounded-2xl border bg-white p-6 text-left shadow-sm hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">単語カード学習</p>
            <p className="mt-1 text-sm text-gray-500">日本語⇔英語の一対一で暗記・復習する、従来のフラッシュカードモード</p>
          </div>
        </button>
      </div>
    </div>
  )
}
