export interface WordCard {
  id: string
  japanese: string
  english: string
  notes: string[]
  images: string[] // base64 data URLs
  masteryLevel: number // 0-5
  nextReviewDate: string // ISO string
  reviewCount: number
  correctCount: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  projectId: string // '' = 未分類
  cardType: 'flashcard' | 'nuance' // モード別データ分離
  groupId: string // '' = 未グループ。ニュアンス比較モード用（例: 'delicious系'）
  degreeRank: number // 0 = 未設定。1〜6でグループ内の強度ランク
  exampleSentence: string // ニュアンス比較モードの出題文。対象の英単語を含む例文
}

export interface Project {
  id: string
  name: string
  direction?: StudyDirection // プロジェクト個別の出題方向
  createdAt: string
  updatedAt: string
}

export type StudyDirection = 'ja-to-en' | 'en-to-ja'

// 学習モード: 従来の一対一フラッシュカード / ニュアンス比較
export type AppMode = 'flashcard' | 'nuance'

export type StudyResult = 'correct' | 'incorrect'

// Mastery level → interval days
export const MASTERY_INTERVALS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
}
