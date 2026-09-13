import type { WorkspaceProjectBundle, WorkspaceSnapshot, WorkspaceThread, WorkspaceType } from '../domain-adapter.ts'
import type { DesktopSettingsState } from './DesktopSettings.tsx'
import { ChatPanel } from './ChatPanel.tsx'
import { ResearchConsole } from './ResearchConsole.tsx'
import { WorkspaceRail } from './WorkspaceRail.tsx'

type WorkspaceShellProps = {
  snapshot: WorkspaceSnapshot
  activeProject: WorkspaceProjectBundle | null
  activeThread: WorkspaceThread | null
  storageWarning: string | null
  onCreateProject: () => void
  onCreateConversation: (projectId?: string) => void
  onSelectProject: (projectId: string) => void
  onSelectThread: (threadId: string) => void
  onLockThreadMode: (threadId: string, mode: WorkspaceType) => void
  onOpenOverview: () => void
  onOpenFolder: () => void
  onUpdateProject: (project: WorkspaceProjectBundle) => void
  onResetWorkspace: () => void
  consoleMode: 'research' | 'settings'
  onSelectConsoleMode: (mode: 'research' | 'settings') => void
  desktopSettings: DesktopSettingsState
  onUpdateDesktopSettings: (next: DesktopSettingsState) => void
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <main className="coscience-shell">
      <WorkspaceRail
        runtime={props.snapshot.runtime}
        projects={props.snapshot.projects}
        threads={props.snapshot.threads}
        activeProject={props.activeProject}
        activeThread={props.activeThread}
        onCreateProject={props.onCreateProject}
        onCreateConversation={props.onCreateConversation}
        onSelectProject={props.onSelectProject}
        onSelectThread={props.onSelectThread}
        onLockThreadMode={props.onLockThreadMode}
        onOpenOverview={props.onOpenOverview}
        onOpenFolder={props.onOpenFolder}
        onOpenSettings={() => props.onSelectConsoleMode('settings')}
      />
      <ChatPanel
        project={props.activeProject}
        thread={props.activeThread}
        onUpdateProject={props.onUpdateProject}
      />
      <ResearchConsole
        project={props.activeProject}
        thread={props.activeThread}
        onUpdateProject={props.onUpdateProject}
        onSelectThread={props.onSelectThread}
        consoleMode={props.consoleMode}
        onSelectConsoleMode={props.onSelectConsoleMode}
        desktopSettings={props.desktopSettings}
        onUpdateDesktopSettings={props.onUpdateDesktopSettings}
      />
    </main>
  )
}
