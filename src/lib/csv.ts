import Papa from 'papaparse'
import type { WordCard } from '../types'

export function exportToCSV(cards: WordCard[]): void {
  const rows = cards.map((c) => ({
    japanese: c.japanese,
    english: c.english,
    notes: c.notes,
    masteryLevel: c.masteryLevel,
    reviewCount: c.reviewCount,
    correctCount: c.correctCount,
    nextReviewDate: c.nextReviewDate,
    createdAt: c.createdAt,
  }))

  const csv = Papa.unparse(rows, { header: true })
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vocabulary_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function importFromCSV(file: File): Promise<Partial<WordCard>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cards: Partial<WordCard>[] = results.data
          .filter((row) => row.japanese || row.english)
          .map((row) => ({
            japanese: row.japanese ?? '',
            english: row.english ?? '',
            notes: row.notes ?? '',
            masteryLevel: parseInt(row.masteryLevel ?? '0', 10) || 0,
            reviewCount: parseInt(row.reviewCount ?? '0', 10) || 0,
            correctCount: parseInt(row.correctCount ?? '0', 10) || 0,
            images: [],
          }))
        resolve(cards)
      },
      error: reject,
    })
  })
}
