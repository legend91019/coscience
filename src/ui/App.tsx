import { useEffect, useMemo, useState } from 'react'
import {
  createWorkspaceProject,
  type WorkspaceProjectBundle,
  type WorkspaceSnapshot,
  type WorkspaceThread,
  type WorkspaceType,
} from './domain-adapter.ts'
import {
  createBrowserWorkspaceRepository,
  createEmptyWorkspaceSnapshot,
  InvalidWorkspaceDataError,
} from './repository.ts'
import {
  createEmptyDesktopSettings,
  type DesktopSettingsState,
} from './components/DesktopSettings.tsx'
import { WorkspaceShell } from './components/WorkspaceShell.tsx'
import './App.css'

const repository =
  typeof window === 'undefined' ? null : createBrowserWorkspaceRepository(window.localStorage)

export function App() {
  const [initialWorkspace] = useState(loadInitialWorkspace)
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initialWorkspace.snapshot)
  const [storageWarning, setStorageWarning] = useState<string | null>(initialWorkspace.warning)
  const [consoleMode, setConsoleMode] = useState<'research' | 'settings'>('research')
  const [desktopSettings, setDesktopSettings] = useState<DesktopSettingsState>(() => createEmptyDesktopSettings())

  useEffect(() => {
    repository?.save(snapshot)
  }, [snapshot])

  const activeProject = useMemo(() => {
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId)
    return project ? bundleFromSnapshot(snapshot, project.id) : null
  }, [snapshot])

  const activeThread =
    snapshot.threads.find((thread) => thread.id === snapshot.activeThreadId) ??
    activeProject?.threads[0] ??
    null

  function updateProject(project: WorkspaceProjectBundle, activeThreadId = snapshot.activeThreadId) {
    setSnapshot((current) => mergeProjectBundle(current, project, activeThreadId))
  }

  function createProject() {
    const createdAt = Date.now()
    const project = createWorkspaceProject(
      `project-${snapshot.projects.length + 1}`,
      `Research workspace ${snapshot.projects.length + 1}`,
      createdAt,
    )
    const threadId = project.threads[0]?.id ?? null
    setSnapshot((current) =>
      mergeProjectBundle(
        { ...current, activeProjectId: project.id, activeThreadId: threadId },
        project,
        threadId,
      ),
    )
  }

  function selectProject(projectId: string) {
    setSnapshot((current) => ({
      ...current,
      activeProjectId: projectId,
      activeThreadId: current.threads.find((thread) => thread.projectId === projectId)?.id ?? null,
    }))
  }

  function selectConversation(type: WorkspaceType) {
    if (!activeProject) {
      const createdAt = Date.now()
      const project = createWorkspaceProject(
        `project-${snapshot.projects.length + 1}`,
        `Research workspace ${snapshot.projects.length + 1}`,
        createdAt,
      )
      const threadId = threadIdForType(project.id, type)
      setSnapshot((current) =>
        mergeProjectBundle(
          { ...current, activeProjectId: project.id, activeThreadId: threadId },
          project,
          threadId,
        ),
      )
      return
    }

    setSnapshot((current) => ({
      ...current,
      activeProjectId: activeProject.id,
      activeThreadId: threadIdForType(activeProject.id, type),
    }))
  }

  function resetWorkspace() {
    setStorageWarning(null)
    setSnapshot(createEmptyWorkspaceSnapshot())
  }

  return (
    <WorkspaceShell
      snapshot={snapshot}
      activeProject={activeProject}
      activeThread={activeThread}
      storageWarning={storageWarning}
      onCreateProject={createProject}
      onCreateConversation={selectConversation}
      onSelectProject={selectProject}
      onSelectThread={(threadId) => setSnapshot((current) => ({ ...current, activeThreadId: threadId }))}
      onUpdateProject={updateProject}
      onResetWorkspace={resetWorkspace}
      consoleMode={consoleMode}
      onSelectConsoleMode={setConsoleMode}
      desktopSettings={desktopSettings}
      onUpdateDesktopSettings={setDesktopSettings}
    />
  )
}

function threadIdForType(projectId: string, type: WorkspaceType): string {
  if (type === 'idea') return `${projectId}-idea`
  if (type === 'experiment') return `${projectId}-pilot`
  if (type === 'figure') return `${projectId}-figures`
  return `${projectId}-writing`
}

function bundleFromSnapshot(snapshot: WorkspaceSnapshot, projectId: string): WorkspaceProjectBundle {
  const project = snapshot.projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`Project ${projectId} does not exist.`)

  return {
    ...project,
    threads: snapshot.threads.filter((item) => item.projectId === projectId),
    notes: snapshot.notes.filter((item) => item.projectId === projectId),
    sources: snapshot.sources.filter((item) => item.projectId === projectId),
    hypotheses: snapshot.hypotheses.filter((item) => item.projectId === projectId),
    nodes: snapshot.nodes.filter((item) => item.projectId === projectId),
    runs: snapshot.runs.filter((item) => item.projectId === projectId),
    evidences: snapshot.evidences.filter((item) => item.projectId === projectId),
    decisions: snapshot.decisions.filter((item) => item.projectId === projectId),
  }
}

function mergeProjectBundle(
  snapshot: WorkspaceSnapshot,
  project: WorkspaceProjectBundle,
  activeThreadId: string | null,
): WorkspaceSnapshot {
  return {
    ...snapshot,
    activeProjectId: project.id,
    activeThreadId,
    projects: upsertById(snapshot.projects, project),
    threads: replaceProjectRecords(snapshot.threads, project.id, project.threads),
    notes: replaceProjectRecords(snapshot.notes, project.id, project.notes),
    sources: replaceProjectRecords(snapshot.sources, project.id, project.sources),
    hypotheses: replaceProjectRecords(snapshot.hypotheses, project.id, project.hypotheses),
    nodes: replaceProjectRecords(snapshot.nodes, project.id, project.nodes),
    runs: replaceProjectRecords(snapshot.runs, project.id, project.runs),
    evidences: replaceProjectRecords(snapshot.evidences, project.id, project.evidences),
    decisions: replaceProjectRecords(snapshot.decisions, project.id, project.decisions),
  }
}

function replaceProjectRecords<T extends { projectId: string }>(
  records: T[],
  projectId: string,
  replacements: T[],
): T[] {
  return [...records.filter((item) => item.projectId !== projectId), ...replacements]
}

function upsertById<T extends { id: string }>(records: T[], replacement: T): T[] {
  const exists = records.some((item) => item.id === replacement.id)
  return exists ? records.map((item) => (item.id === replacement.id ? replacement : item)) : [...records, replacement]
}

function loadInitialWorkspace(): { snapshot: WorkspaceSnapshot; warning: string | null } {
  if (!repository) {
    return { snapshot: createEmptyWorkspaceSnapshot(), warning: null }
  }

  try {
    return { snapshot: repository.load(), warning: null }
  } catch (error) {
    if (error instanceof InvalidWorkspaceDataError) {
      return {
        snapshot: createEmptyWorkspaceSnapshot(),
        warning: '保存的工作区数据无法读取，但原数据尚未清除。',
      }
    }
    throw error
  }
}

export default App
