import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Command,
  FlaskConical,
  Folder,
  Lightbulb,
  MoreHorizontal,
  PenLine,
  Plus,
  Radio,
  Settings2,
} from 'lucide-react'
import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import {
  workspaceTypeLabel,
  type WorkspaceProjectBundle,
  type WorkspaceProjectSummary,
  type WorkspaceSnapshot,
  type WorkspaceThread,
  type WorkspaceType,
} from '../domain-adapter.ts'

type WorkspaceRailProps = {
  runtime: WorkspaceSnapshot['runtime']
  projects: WorkspaceProjectSummary[]
  threads: WorkspaceThread[]
  activeProject: WorkspaceProjectBundle | null
  activeThread: WorkspaceThread | null
  onCreateProject: () => void
  onCreateConversation: (projectId?: string) => void
  onSelectProject: (projectId: string) => void
  onSelectThread: (threadId: string) => void
  onLockThreadMode: (threadId: string, mode: WorkspaceType) => void
  onOpenOverview: () => void
  onOpenSettings: () => void
}

export function WorkspaceRail(props: WorkspaceRailProps) {
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(new Set())
  const [modeMenuThreadId, setModeMenuThreadId] = useState<string | null>(null)

  function toggleProject(projectId: string) {
    setCollapsedProjectIds((current) => {
      const next = new Set(current)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  function showModeMenu(event: MouseEvent<HTMLButtonElement>, thread: WorkspaceThread) {
    if (thread.mode !== null) return
    event.preventDefault()
    setModeMenuThreadId(thread.id)
  }

  return (
    <aside className="project-rail" aria-label="项目与对话导航">
      <div className="rail-brand-row">
        <button className="rail-brand" type="button" onClick={props.onOpenOverview} aria-label="打开 CoScience 总览">
          <span className="rail-brand-mark"><Command size={16} /></span>
          <span className="rail-brand-name">CoScience</span>
        </button>
        <button className="icon-button quiet" type="button" aria-label="更多全局操作">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="rail-actions">
        <button className="new-conversation-button" type="button" onClick={() => props.onCreateConversation(props.activeProject?.id)}>
          <Plus size={16} />
          <span>新对话</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button className="global-entry" type="button" onClick={props.onOpenOverview}>
          <Command size={15} />
          <span>所有项目</span>
        </button>
      </div>

      <div className="rail-projects">
        <div className="rail-section-heading">
          <h2>项目</h2>
          <button className="icon-button quiet small" type="button" aria-label="新建项目" onClick={props.onCreateProject}>
            <Plus size={15} />
          </button>
        </div>

        {props.projects.length === 0 ? (
          <button className="project-empty-row" type="button" onClick={props.onCreateProject}>
            <Folder size={15} />
            <span>新建文件夹项目</span>
          </button>
        ) : (
          props.projects.map((project) => {
            const projectThreads = props.threads.filter((thread) => thread.projectId === project.id)
            const collapsed = collapsedProjectIds.has(project.id)
            const active = project.id === props.activeProject?.id

            return (
              <section className={active ? 'project-group active' : 'project-group'} key={project.id}>
                <div className="project-group-row">
                  <button
                    className="project-toggle"
                    type="button"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? '展开' : '折叠'} ${project.name}`}
                    onClick={() => toggleProject(project.id)}
                  >
                    {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button
                    className="project-name-button"
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => props.onSelectProject(project.id)}
                  >
                    <Folder size={15} />
                    <span>{project.name}</span>
                    <small>{projectThreads.length}</small>
                  </button>
                  <button
                    className="project-add-button"
                    type="button"
                    aria-label={`在 ${project.name} 中新建对话`}
                    onClick={() => props.onCreateConversation(project.id)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {!collapsed ? (
                  <div className="project-thread-list">
                    {projectThreads.length === 0 ? (
                      <button className="thread-empty-row" type="button" onClick={() => props.onCreateConversation(project.id)}>
                        <Plus size={14} />
                        <span>新建对话</span>
                      </button>
                    ) : (
                      projectThreads.map((thread) => (
                        <div className="thread-entry" key={thread.id}>
                          <button
                            className={thread.id === props.activeThread?.id ? 'thread-row selected' : 'thread-row'}
                            type="button"
                            onClick={() => props.onSelectThread(thread.id)}
                            onContextMenu={(event) => showModeMenu(event, thread)}
                          >
                            <ThreadModeIcon mode={thread.mode} />
                            <span className="thread-row-label">{thread.title}</span>
                            {thread.mode ? <span className={`thread-mode-badge thread-mode-badge--${thread.mode}`}>{shortModeLabel(thread.mode)}</span> : null}
                          </button>
                          {modeMenuThreadId === thread.id && thread.mode === null ? (
                            <ModeContextMenu
                              onSelect={(mode) => {
                                props.onLockThreadMode(thread.id, mode)
                                setModeMenuThreadId(null)
                              }}
                              onClose={() => setModeMenuThreadId(null)}
                            />
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            )
          })
        )}
      </div>

      <div className="rail-spacer" />

      <div className="connection-strip" aria-label="运行状态">
        <StatusPill icon={<Radio size={13} />} label="服务" value={stateLabel(props.runtime.server)} />
        <StatusPill icon={<CircleAlert size={13} />} label="模型" value={stateLabel(props.runtime.model)} />
      </div>

      <div className="rail-footer">
        <button className="global-entry" type="button" onClick={props.onOpenSettings}>
          <Settings2 size={15} />
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}

function ThreadModeIcon({ mode }: { mode: WorkspaceType | null }) {
  if (mode === 'idea') return <Lightbulb size={15} className="thread-mode-icon thread-mode-icon--idea" />
  if (mode === 'experiment') return <FlaskConical size={15} className="thread-mode-icon thread-mode-icon--experiment" />
  if (mode === 'figure') return <BarChart3 size={15} className="thread-mode-icon thread-mode-icon--figure" />
  if (mode === 'writing') return <PenLine size={15} className="thread-mode-icon thread-mode-icon--writing" />
  return <CircleHelp size={15} className="thread-mode-icon thread-mode-icon--unset" />
}

function ModeContextMenu({
  onSelect,
  onClose,
}: {
  onSelect: (mode: WorkspaceType) => void
  onClose: () => void
}) {
  return (
    <div className="mode-context-menu" role="menu" aria-label="选择对话模式">
      <div className="mode-context-title">固定模式</div>
      {(['idea', 'experiment', 'figure', 'writing'] as WorkspaceType[]).map((mode) => (
        <button type="button" role="menuitem" key={mode} onClick={() => onSelect(mode)}>
          <ThreadModeIcon mode={mode} />
          <span>{workspaceTypeLabel(mode).replace(' 对话', '')}</span>
        </button>
      ))}
      <button className="mode-context-cancel" type="button" onClick={onClose}>取消</button>
    </div>
  )
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="status-pill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  )
}

function shortModeLabel(mode: WorkspaceType): string {
  return {
    idea: 'Idea',
    experiment: '实验',
    figure: '画图',
    writing: '写论文',
  }[mode]
}

function stateLabel(value: string): string {
  return (
    {
      'not-configured': '未配置',
      disconnected: '已断开',
      connected: '已连接',
      unknown: '未知',
      ready: '就绪',
    }[value] ?? value
  )
}
