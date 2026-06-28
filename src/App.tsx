import { useState } from 'react'
import { BookOpen, LogOut, CloudOff, Cloud, Settings } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useCards } from './hooks/useCards'
import { useProjects } from './hooks/useProjects'
import { useSettings } from './hooks/useSettings'
import { ProjectList } from './components/ProjectList'
import { WordList } from './components/WordList'
import { StudyMode } from './components/StudyMode'
import { AuthScreen } from './components/AuthScreen'
import { SettingsModal } from './components/SettingsModal'
import { isFirebaseConfigured } from './lib/firebase'

type View = 'projects' | 'list' | 'study'

export default function App() {
  const { user, loading, login, register, logout } = useAuth()
  const [skipped, setSkipped] = useState(false)
  const [view, setView] = useState<View>('projects')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'favorites'>('')

  const { rate, setRate, direction, setDirection, voiceLang, setVoiceLang } = useSettings()

  const userId = user?.uid ?? null
  const { cards, addCard, updateCard, deleteCard, deleteMany, recordResult, importCards, toggleFavorite } = useCards(
    skipped ? null : userId,
  )
  const { projects, addProject, updateProject, deleteProject } = useProjects(
    skipped ? null : userId,
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (isFirebaseConfigured && !user && !skipped) {
    return <AuthScreen onLogin={login} onRegister={register} onSkip={() => setSkipped(true)} />
  }

  // 現在のプロジェクトでフィルタされたカード
  const scopedCards =
    selectedProjectId === 'favorites'
      ? cards.filter((c) => c.isFavorite)
      : selectedProjectId === ''
      ? cards
      : cards.filter((c) => c.projectId === selectedProjectId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView('projects')}
          >
            <BookOpen size={22} className="text-indigo-600" />
            <span className="font-bold text-gray-800">語彙学習</span>
          </div>
          <div className="flex items-center gap-2">
            {isFirebaseConfigured ? (
              user ? (
                <>
                  <Cloud size={16} className="text-green-500" aria-label="同期中" />
                  <span className="hidden text-xs text-gray-500 sm:inline">{user.email}</span>
                  <button
                    onClick={logout}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                    aria-label="ログアウト"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <CloudOff size={16} className="text-gray-400" aria-label="ローカルモード" />
              )
            ) : (
              <span className="text-xs text-gray-400">ローカルモード</span>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              aria-label="設定"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {view === 'projects' && (
          <ProjectList
            projects={projects}
            cards={cards}
            onSelectProject={(pid) => {
              setSelectedProjectId(pid)
              setView('list')
            }}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
          />
        )}
        {view === 'list' && (
          <WordList
            cards={cards}
            projects={projects}
            projectId={selectedProjectId}
            direction={direction}
            rate={rate}
            voiceLang={voiceLang}
            onDirectionChange={setDirection}
            onAdd={(partial) => addCard({ ...partial, projectId: selectedProjectId === 'favorites' ? '' : selectedProjectId })}
            onUpdate={updateCard}
            onDelete={deleteCard}
            onDeleteMany={deleteMany}
            onToggleFavorite={toggleFavorite}
            onImport={importCards}
            onStudy={() => setView('study')}
            onBack={() => setView('projects')}
          />
        )}
        {view === 'study' && (
          <StudyMode
            cards={scopedCards}
            projects={projects}
            direction={direction}
            rate={rate}
            voiceLang={voiceLang}
            onResult={recordResult}
            onUpdate={updateCard}
            onBack={() => setView('list')}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          rate={rate}
          voiceLang={voiceLang}
          onRateChange={setRate}
          onVoiceLangChange={setVoiceLang}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
