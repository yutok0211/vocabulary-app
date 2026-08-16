import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { WordCard, Project } from '../types'

const LOCAL_KEY = 'vocab_cards'
const LOCAL_PROJECTS_KEY = 'vocab_projects'

// ── ローカルストレージ ──────────────────────────────────────
export function loadLocal(): WordCard[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveLocal(cards: WordCard[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cards))
}

// 1枚だけ差し替え（全件書き直しより高速）
export function patchLocal(card: WordCard): void {
  try {
    const cards: WordCard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    const idx = cards.findIndex((c) => c.id === card.id)
    if (idx >= 0) cards[idx] = card
    else cards.push(card)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cards))
  } catch {
    // fallback: no-op (Firebase が正とみなす)
  }
}

// 削除
export function removeLocal(cardId: string): void {
  try {
    const cards: WordCard[] = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cards.filter((c) => c.id !== cardId)))
  } catch { /* no-op */ }
}

export function loadLocalProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects))
}

// ── Firebase cards ──────────────────────────────────────────
function cardsCol(userId: string) {
  return collection(db!, 'users', userId, 'cards')
}

export async function saveCardRemote(userId: string, card: WordCard): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  await setDoc(doc(cardsCol(userId), card.id), card)
}

export async function deleteCardRemote(userId: string, cardId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  await deleteDoc(doc(cardsCol(userId), cardId))
}

export function subscribeCards(
  userId: string,
  onUpdate: (cards: WordCard[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {}
  return onSnapshot(cardsCol(userId), (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as WordCard))
  })
}

// ── Firebase projects ───────────────────────────────────────
function projectsCol(userId: string) {
  return collection(db!, 'users', userId, 'projects')
}

export async function saveProjectRemote(userId: string, project: Project): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  await setDoc(doc(projectsCol(userId), project.id), project)
}

export async function deleteProjectRemote(userId: string, projectId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return
  await deleteDoc(doc(projectsCol(userId), projectId))
}

export function subscribeProjects(
  userId: string,
  onUpdate: (projects: Project[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {}
  return onSnapshot(projectsCol(userId), (snap) => {
    onUpdate(snap.docs.map((d) => d.data() as Project))
  })
}
