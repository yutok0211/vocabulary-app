import { MASTERY_INTERVALS, type WordCard, type StudyResult } from '../types'

export function updateMastery(card: WordCard, result: StudyResult): Partial<WordCard> {
  const now = new Date()
  let newLevel = card.masteryLevel

  if (result === 'correct') {
    newLevel = Math.min(5, card.masteryLevel + 1)
  } else {
    newLevel = Math.max(0, card.masteryLevel - 1)
  }

  const intervalDays = MASTERY_INTERVALS[newLevel]
  const nextReview = new Date(now)
  nextReview.setDate(nextReview.getDate() + intervalDays)

  return {
    masteryLevel: newLevel,
    nextReviewDate: nextReview.toISOString(),
    reviewCount: card.reviewCount + 1,
    correctCount: result === 'correct' ? card.correctCount + 1 : card.correctCount,
    updatedAt: now.toISOString(),
  }
}

export function isDueForReview(card: WordCard): boolean {
  if (card.masteryLevel === 0) return true
  return new Date(card.nextReviewDate) <= new Date()
}

export function getDueCards(cards: WordCard[]): WordCard[] {
  return cards.filter(isDueForReview)
}

export function getMasteryLabel(level: number): string {
  const labels = ['未学習', '初級', '初中級', '中級', '上級', '習得済']
  return labels[level] ?? '未学習'
}

export function getMasteryColor(level: number): string {
  const colors = [
    'bg-gray-200 text-gray-700',
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700',
    'bg-yellow-100 text-yellow-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
  ]
  return colors[level] ?? colors[0]
}
