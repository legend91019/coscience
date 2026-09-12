import { useEffect, useMemo, useState } from 'react'
import {
  appendWorkspaceThread,
  createWorkspaceProject,
  lockWorkspaceThreadMode,
  type WorkspaceProjectBundle,
  type WorkspaceProjectSummary,
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
import { ConversationModePicker } from './components/ConversationModePicker.tsx'
import { WorkspaceShell } from './components/WorkspaceShell.tsx'
import { WorkspaceSelector } from './components/WorkspaceSelector.tsx'
import { PaperUploader } from './components/PaperUploader.tsx'
import './App.css'

const repository =
  typeof window === 'undefined' ? null : createBrowserWorkspaceRepository(window.localStorage)

export function App() {
  const [initialWorkspace] = useState(loadInitialWorkspace)
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initialWorkspace.snapshot)
  const [storageWarning, setStorageWarning] = useState<string | null>(initialWorkspace.warning)
  const [consoleMode, setConsoleMode] = useState<'research' | 'settings'>('research')
  const [desktopSettings, setDesktopSettings] = useState<DesktopSettingsState>(() => createEmptyDesktopSettings())
  
  // 新增：项目路径和工作区状态
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false)
  const [showPaperUploader, setShowPaperUploader] = useState(false)
  const [conversationProjectId, setConversationProjectId] = useState<string | null>(null)
  const [showConversationModePicker, setShowConversationModePicker] = useState(false)

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
    setSnapshot((current) =>
      mergeProjectBundle(
        { ...current, activeProjectId: project.id, activeThreadId: null },
        project,
        null,
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

  function openConversationModePicker(projectId = snapshot.activeProjectId) {
    setConversationProjectId(projectId)
    setShowConversationModePicker(true)
  }

  function lockConversationMode(threadId: string, mode: WorkspaceType) {
    const thread = snapshot.threads.find((item) => item.id === threadId)
    if (!thread || thread.mode !== null) return
    const project = bundleFromSnapshot(snapshot, thread.projectId)
    const updated = lockWorkspaceThreadMode(project, threadId, mode)
    setSnapshot((current) => mergeProjectBundle(current, updated, current.activeThreadId))
  }

  function createConversation(mode: WorkspaceType) {
    const createdAt = Date.now()
    const targetProjectId = conversationProjectId ?? snapshot.activeProjectId
    const targetProject = targetProjectId
      ? snapshot.projects.find((project) => project.id === targetProjectId)
      : null

    if (targetProject) {
      const updated = appendWorkspaceThread(bundleFromSnapshot(snapshot, targetProject.id), mode, createdAt)
      setSnapshot((current) => mergeProjectBundle(current, updated.project, updated.thread.id))
    } else {
      const project = createWorkspaceProject(
        `project-${snapshot.projects.length + 1}`,
        `Research workspace ${snapshot.projects.length + 1}`,
        createdAt,
      )
      const updated = appendWorkspaceThread(project, mode, createdAt)
      setSnapshot((current) =>
        mergeProjectBundle(
          { ...current, activeProjectId: updated.project.id, activeThreadId: updated.thread.id },
          updated.project,
          updated.thread.id,
        ),
      )
    }

    setConversationProjectId(null)
    setShowConversationModePicker(false)
  }

  function resetWorkspace() {
    setStorageWarning(null)
    setSnapshot(createEmptyWorkspaceSnapshot())
    setProjectPath(null)
    setShowWorkspaceSelector(false)
    setConversationProjectId(null)
    setShowConversationModePicker(false)
  }

  // 新增：打开文件夹
  async function handleOpenFolder() {
    try {
      const path = await window.electronAPI.selectFolder()
      if (path) {
        setProjectPath(path)
        
        // 检查是否是现有项目
        const result = await window.electronAPI.openProject(path)
        if (result.success) {
          // 加载现有项目
          void loadProjectFromPath(path)
        } else {
          // 创建新项目
          setShowWorkspaceSelector(true)
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }

  // 新增：从路径加载项目
  async function loadProjectFromPath(path: string) {
    try {
      setSnapshot((current) =>
        (() => {
          const existingProject = current.projects.find((project) => project.folderPath === path)
          if (existingProject) {
            return {
              ...current,
              activeProjectId: existingProject.id,
              activeThreadId: current.threads.find((thread) => thread.projectId === existingProject.id)?.id ?? null,
            }
          }

          const project = createWorkspaceProject(
            projectIdForFolder(path, current.projects),
            path.split(/[/\\]/).pop() || 'Project',
            Date.now(),
            path,
          )

          return mergeProjectBundle(
            { ...current, activeProjectId: project.id, activeThreadId: null },
            project,
            null,
          )
        })(),
      )
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  }

  // 新增：选择工作区类型
  function handleSelectWorkspace(type: WorkspaceType) {
    setShowWorkspaceSelector(false)
    setConversationProjectId(null)
    setSnapshot((current) => {
      const project = projectPath
        ? current.projects.find((item) => item.folderPath === projectPath)
        : current.activeProjectId
          ? current.projects.find((item) => item.id === current.activeProjectId)
          : null
      if (project) return current

      const createdAt = Date.now()
      const createdProject = createWorkspaceProject(
        projectIdForFolder(projectPath ?? '', current.projects),
        projectPath?.split(/[/\\]/).pop() || `Research workspace ${current.projects.length + 1}`,
        createdAt,
        projectPath ?? undefined,
      )
      const updated = appendWorkspaceThread(createdProject, type, createdAt)
      return mergeProjectBundle(
        { ...current, activeProjectId: updated.project.id, activeThreadId: updated.thread.id },
        updated.project,
        updated.thread.id,
      )
    })
  }

  // 新增：打开文件
  function handleOpenFile(filePath: string) {
    console.log('Opening file:', filePath)
    // 这里应该打开文件预览或编辑器
  }

  // 新增：上传论文
  function handleUploadPaper() {
    setShowPaperUploader(true)
  }

  // 新增：完成论文上传
  function handlePaperUpload(sourcePath: string, category: 'deep-read' | 'skim-read') {
    console.log('Paper uploaded:', sourcePath, category)
    setShowPaperUploader(false)
    // 这里应该刷新文件列表
  }

  // 如果没有项目路径，显示欢迎界面或文件夹选择
  if (!projectPath && snapshot.projects.length === 0) {
    return (
      <div className="app-welcome">
        <div className="app-welcome-content">
          <h1>CoScience</h1>
          <p>人类主导的AI研究工作台</p>
          <button className="app-welcome-button" onClick={handleOpenFolder}>
            打开文件夹
          </button>
          <button className="app-welcome-button secondary" onClick={createProject}>
            创建新项目
          </button>
        </div>
      </div>
    )
  }

  // 如果需要选择工作区
  if (showWorkspaceSelector) {
    return (
      <WorkspaceSelector
        projectName={projectPath?.split(/[/\\]/).pop() || 'Project'}
        onSelectWorkspace={handleSelectWorkspace}
      />
    )
  }

  return (
    <div className="app-shell-root">
      <WorkspaceShell
        snapshot={snapshot}
        activeProject={activeProject}
        activeThread={activeThread}
        storageWarning={storageWarning}
        onCreateProject={createProject}
        onCreateConversation={openConversationModePicker}
        onSelectProject={selectProject}
        onSelectThread={(threadId) => setSnapshot((current) => ({ ...current, activeThreadId: threadId }))}
        onLockThreadMode={lockConversationMode}
        onOpenOverview={() => setSnapshot((current) => ({ ...current, activeProjectId: null, activeThreadId: null }))}
        onUpdateProject={updateProject}
        onResetWorkspace={resetWorkspace}
        consoleMode={consoleMode}
        onSelectConsoleMode={setConsoleMode}
        desktopSettings={desktopSettings}
        onUpdateDesktopSettings={setDesktopSettings}
      />
      {showConversationModePicker ? (
        <ConversationModePicker
          projectName={activeProject?.name ?? '新项目'}
          onSelect={createConversation}
          onClose={() => {
            setConversationProjectId(null)
            setShowConversationModePicker(false)
          }}
        />
      ) : null}
      
      {showPaperUploader && projectPath && (
        <PaperUploader
          projectPath={projectPath}
          onUpload={handlePaperUpload}
          onClose={() => setShowPaperUploader(false)}
        />
      )}
    </div>
  )
}

export default App

function projectIdForFolder(folderPath: string, projects: WorkspaceProjectSummary[]): string {
  const existing = projects.find((project) => project.folderPath === folderPath)
  if (existing) return existing.id
  const slug = folderPath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-36)
  return `folder-${slug || projects.length + 1}`
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
