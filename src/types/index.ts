export interface WordCard {
  id: string
  japanese: string
  english: string
  notes: string
  images: string[] // base64 data URLs
  masteryLevel: number // 0-5
  nextReviewDate: string // ISO string
  reviewCount: number
  correctCount: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  projectId: string // '' = 未分類
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type StudyDirection = 'ja-to-en' | 'en-to-ja'

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
