import type { WorkspaceProjectBundle, WorkspaceSnapshot, WorkspaceThread, WorkspaceType } from '../domain-adapter.ts'
import type { DesktopSettingsState } from './DesktopSettings.tsx'
import { EvidenceSpine } from './EvidenceSpine.tsx'
import { ResearchConsole } from './ResearchConsole.tsx'
import { WorkspaceRail } from './WorkspaceRail.tsx'

type WorkspaceShellProps = {
  snapshot: WorkspaceSnapshot
  activeProject: WorkspaceProjectBundle | null
  activeThread: WorkspaceThread | null
  storageWarning: string | null
  onCreateProject: () => void
  onCreateConversation: (type: WorkspaceType) => void
  onSelectProject: (projectId: string) => void
  onSelectThread: (threadId: string) => void
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
        activeProject={props.activeProject}
        activeThread={props.activeThread}
        onCreateProject={props.onCreateProject}
        onCreateConversation={props.onCreateConversation}
        onSelectProject={props.onSelectProject}
        onSelectThread={props.onSelectThread}
        onOpenSettings={() => props.onSelectConsoleMode('settings')}
      />

      <EvidenceSpine
        project={props.activeProject}
        thread={props.activeThread}
        storageWarning={props.storageWarning}
        onUpdateProject={props.onUpdateProject}
        onResetWorkspace={props.onResetWorkspace}
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
