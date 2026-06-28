import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../types'
import {
  loadLocalProjects,
  saveLocalProjects,
  saveProjectRemote,
  deleteProjectRemote,
  subscribeProjects,
} from '../lib/storage'

export function useProjects(userId: string | null) {
  const [projects, setProjects] = useState<Project[]>(() => loadLocalProjects())

  useEffect(() => {
    if (!userId) return
    const unsub = subscribeProjects(userId, (remote) => {
      setProjects(remote)
      saveLocalProjects(remote)
    })
    return unsub
  }, [userId])

  const persist = useCallback(
    (updated: Project[], changed?: Project, deleted?: string) => {
      setProjects(updated)
      saveLocalProjects(updated)
      if (userId) {
        if (changed) saveProjectRemote(userId, changed)
        if (deleted) deleteProjectRemote(userId, deleted)
      }
    },
    [userId],
  )

  const addProject = useCallback(
    (name: string): Project => {
      const now = new Date().toISOString()
      const project: Project = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now }
      persist([...projects, project], project)
      return project
    },
    [projects, persist],
  )

  const updateProject = useCallback(
    (id: string, name: string) => {
      const updated = projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
      )
      const changed = updated.find((p) => p.id === id)!
      persist(updated, changed)
    },
    [projects, persist],
  )

  const deleteProject = useCallback(
    (id: string) => {
      persist(projects.filter((p) => p.id !== id), undefined, id)
    },
    [projects, persist],
  )

  return { projects, addProject, updateProject, deleteProject }
}
