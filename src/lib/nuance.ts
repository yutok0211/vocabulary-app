import type { WordCard } from '../types'

export interface NuanceGroup {
  groupId: string
  cards: WordCard[] // degreeRank 昇順
}

// groupId・degreeRank が設定されたカードをグループ化する（2枚以上のグループのみ有効）
export function getNuanceGroups(cards: WordCard[]): NuanceGroup[] {
  const map = new Map<string, WordCard[]>()
  for (const c of cards) {
    if (!c.groupId || !c.degreeRank) continue
    if (!map.has(c.groupId)) map.set(c.groupId, [])
    map.get(c.groupId)!.push(c)
  }
  return Array.from(map.entries())
    .map(([groupId, list]) => ({
      groupId,
      cards: [...list].sort((a, b) => a.degreeRank - b.degreeRank),
    }))
    .filter((g) => g.cards.length >= 2)
}

// 出題可能なカード（2枚以上のグループに属し、シチュエーション文が入力済み）
export function getNuanceQuizCards(cards: WordCard[]): WordCard[] {
  const eligibleIds = new Set(getNuanceGroups(cards).flatMap((g) => g.cards.map((c) => c.id)))
  return cards.filter((c) => eligibleIds.has(c.id) && c.exampleSentence.trim())
}

// シチュエーション文中の対象単語を空欄化する。文中に単語が見つからない場合はそのまま返す
export function blankSentence(sentence: string, word: string): string {
  const trimmed = word.trim()
  if (!trimmed) return sentence
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'i')
  return re.test(sentence) ? sentence.replace(re, '_____') : sentence
}
