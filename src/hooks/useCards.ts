import { useState, useEffect, useCallback } from 'react'
import type { WordCard } from '../types'
import { loadLocal, saveLocal, patchLocal, removeLocal, saveCardRemote, deleteCardRemote, subscribeCards } from '../lib/storage'
import { updateMastery } from '../lib/mastery'
import type { StudyResult } from '../types'

function newCard(partial: Partial<WordCard>): WordCard {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    japanese: '',
    english: '',
    notes: [],
    images: [],
    masteryLevel: 0,
    nextReviewDate: now,
    reviewCount: 0,
    correctCount: 0,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    projectId: '',
    cardType: 'flashcard',
    groupId: '',
    degreeRank: 0,
    exampleSentence: '',
    ...partial,
  }
}

function normalizeCard(c: WordCard): WordCard {
  return {
    ...c,
    cardType: c.cardType ?? (c.groupId ? 'nuance' : 'flashcard'),
    notes: Array.isArray(c.notes) ? c.notes : (c.notes ? [c.notes as unknown as string] : []),
    isFavorite: c.isFavorite ?? false,
    projectId: c.projectId ?? '',
    groupId: c.groupId ?? '',
    degreeRank: c.degreeRank ?? 0,
    exampleSentence: c.exampleSentence ?? '',
  }
}

export function useCards(userId: string | null) {
  const [cards, setCards] = useState<WordCard[]>(() =>
    loadLocal().map(normalizeCard)
  )

  useEffect(() => {
    if (!userId) return
    const unsub = subscribeCards(userId, (remote) => {
      const normalized = remote.map(normalizeCard)
      setCards(normalized)
      saveLocal(normalized)
    })
    return unsub
  }, [userId])

  const persist = useCallback(
    (updated: WordCard[], changedCard?: WordCard, deleted?: string) => {
      setCards(updated)
      // 1枚変更の場合は差分書き込みでUI をブロックしない
      if (changedCard && !deleted) {
        patchLocal(changedCard)
      } else if (deleted && !changedCard) {
        removeLocal(deleted)
      } else {
        saveLocal(updated)
      }
      if (userId) {
        if (changedCard) saveCardRemote(userId, changedCard)
        if (deleted) deleteCardRemote(userId, deleted)
      }
    },
    [userId],
  )

  const addCard = useCallback(
    (partial: Partial<WordCard> = {}) => {
      const card = newCard(partial)
      persist([...cards, card], card)
      return card
    },
    [cards, persist],
  )

  const updateCard = useCallback(
    (id: string, changes: Partial<WordCard>) => {
      const updated = cards.map((c) =>
        c.id === id ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c,
      )
      const changed = updated.find((c) => c.id === id)!
      persist(updated, changed)
    },
    [cards, persist],
  )

  const deleteCard = useCallback(
    (id: string) => {
      persist(cards.filter((c) => c.id !== id), undefined, id)
    },
    [cards, persist],
  )

  const deleteMany = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids)
      const updated = cards.filter((c) => !idSet.has(c.id))
      setCards(updated)
      ids.forEach((id) => removeLocal(id))
      if (userId) ids.forEach((id) => deleteCardRemote(userId, id))
    },
    [cards, userId],
  )

  const recordResult = useCallback(
    (id: string, result: StudyResult) => {
      const card = cards.find((c) => c.id === id)
      if (!card) return
      const changes = updateMastery(card, result)
      updateCard(id, changes)
    },
    [cards, updateCard],
  )

  const importCards = useCallback(
    (partials: Partial<WordCard>[]) => {
      const now = new Date().toISOString()
      const imported = partials.map((p) => newCard({ ...p, createdAt: now, updatedAt: now }))
      const merged = [...cards, ...imported]
      imported.forEach((c) => {
        if (userId) saveCardRemote(userId, c)
      })
      setCards(merged)
      saveLocal(merged)
    },
    [cards, userId],
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      const card = cards.find((c) => c.id === id)
      if (!card) return
      updateCard(id, { isFavorite: !card.isFavorite })
    },
    [cards, updateCard],
  )

  return { cards, addCard, updateCard, deleteCard, deleteMany, recordResult, importCards, toggleFavorite }
}
