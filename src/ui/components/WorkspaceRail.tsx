import { CircleAlert, Lightbulb, FlaskConical, BookOpen, Plus, Radio, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { WorkspaceProjectBundle, WorkspaceSnapshot, WorkspaceThread, WorkspaceType } from '../domain-adapter.ts'

type WorkspaceRailProps = {
  runtime: WorkspaceSnapshot['runtime']
  projects: WorkspaceSnapshot['projects']
  activeProject: WorkspaceProjectBundle | null
  activeThread: WorkspaceThread | null
  onCreateProject: () => void
  onCreateConversation: (type: WorkspaceType) => void
  onSelectProject: (projectId: string) => void
  onSelectThread: (threadId: string) => void
  onOpenSettings: () => void
}

export function WorkspaceRail(props: WorkspaceRailProps) {
  return (
    <aside className="project-rail" aria-label="项目导航">
      <div className="rail-header">
        <div>
          <p className="eyebrow">CoScience</p>
          <h1>Evidence loop</h1>
        </div>
        <button className="icon-button" type="button" aria-label="新建项目" onClick={props.onCreateProject}>
          <Plus size={18} />
        </button>
      </div>

      <div className="connection-strip" aria-label="运行状态">
        <StatusPill icon={<Radio size={14} />} label="服务" value={stateLabel(props.runtime.server)} />
        <StatusPill icon={<CircleAlert size={14} />} label="模型" value={stateLabel(props.runtime.model)} />
      </div>

      <RailSectionBlock title="项目">
        {props.projects.length === 0 ? (
          <button className="project-row empty-action" type="button" onClick={props.onCreateProject}>
            <Plus size={16} />
            新建本地工作区
          </button>
        ) : (
          props.projects.map((project) => (
            <button
              className={project.id === props.activeProject?.id ? 'project-row selected' : 'project-row'}
              type="button"
              key={project.id}
              onClick={() => props.onSelectProject(project.id)}
            >
              <span>{project.name}</span>
              <small>{translateProjectSummary(project.summary)}</small>
            </button>
          ))
        )}
      </RailSectionBlock>

      {props.activeProject ? (
        <RailSectionBlock title="对话">
          {props.activeProject.threads.map((thread) => (
            <button
              type="button"
              className={thread.id === props.activeThread?.id ? 'thread-row selected' : 'thread-row'}
              key={thread.id}
              onClick={() => props.onSelectThread(thread.id)}
            >
              {threadIcon(thread.type)}
              <span>{threadTitle(thread.type, thread.title)}</span>
            </button>
          ))}
        </RailSectionBlock>
      ) : null}

      {props.activeProject ? (
        <RailSectionBlock title="实验">
          <div className="experiment-tree" aria-label="Experiment groups">
            <div className="experiment-group">
              <span>复现与小规模验证</span>
              <small>管线验证、Baseline 复现、低成本试验</small>
            </div>
            <div className="experiment-group">
              <span>正式实验</span>
              <small>主结果、消融、鲁棒性与边界实验</small>
            </div>
          </div>
        </RailSectionBlock>
      ) : null}

      <RailSectionBlock title="控制">
        <button className="thread-row" type="button" onClick={() => props.onCreateConversation('idea')}>
          <Lightbulb size={16} />
          <span>Idea 对话</span>
        </button>
        <button className="thread-row" type="button" onClick={() => props.onCreateConversation('experiment')}>
          <FlaskConical size={16} />
          <span>实验对话</span>
        </button>
        <button className="thread-row" type="button" onClick={() => props.onCreateConversation('figure')}>
          <BookOpen size={16} />
          <span>画图对话</span>
        </button>
        <button className="thread-row" type="button" onClick={props.onOpenSettings}>
          <Settings2 size={16} />
          <span>设置</span>
        </button>
      </RailSectionBlock>
    </aside>
  )
}

function RailSectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rail-section">
      <h2>{title}</h2>
      <div className="rail-section-body">{children}</div>
    </section>
  )
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="status-pill">
      {icon}
      {label}: {value}
    </span>
  )
}

function threadIcon(type: WorkspaceType) {
  if (type === 'idea') return <Lightbulb size={16} />
  if (type === 'experiment') return <FlaskConical size={16} />
  if (type === 'figure') return <BookOpen size={16} />
  return <BookOpen size={16} />
}

function threadTitle(type: WorkspaceType, fallback: string): string {
  return (
    {
      idea: 'Idea 与方向',
      experiment: '复现与小规模验证',
      figure: '画图',
      writing: '写作',
    }[type] ?? fallback
  )
}

function translateProjectSummary(summary: string): string {
  if (summary === 'Human-led evidence loop workspace.') return '人类主导的证据闭环工作区'
  return summary
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
