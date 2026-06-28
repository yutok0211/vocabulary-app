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
