import { BookOpen, CircleHelp, FileText, Upload, X } from 'lucide-react'
import { useState } from 'react'
import type { SourceRecord, PaperCategory, WorkspaceProjectBundle, WorkspaceThread } from '../domain-adapter.ts'
import { PanelLeftClose } from 'lucide-react'
import { DesktopSettings, type DesktopSettingsState } from './DesktopSettings.tsx'
import { RemoteConsole } from '../../remote/RemoteConsole.tsx'
import { createRemoteConsoleSnapshot } from '../../remote/console.ts'
import type { RemoteConsoleSnapshot } from '../../remote/console.ts'

type ResearchConsoleProps = {
  project: WorkspaceProjectBundle | null
  thread: WorkspaceThread | null
  onUpdateProject: (project: WorkspaceProjectBundle) => void
  onSelectThread: (threadId: string) => void
  consoleMode: 'research' | 'settings'
  onSelectConsoleMode: (mode: 'research' | 'settings') => void
  desktopSettings: DesktopSettingsState
  onUpdateDesktopSettings: (next: DesktopSettingsState) => void
}

export function ResearchConsole(props: ResearchConsoleProps) {
  if (props.consoleMode === 'settings') {
    return (
      <aside className="side-console" aria-label="工作区设置">
        <header className="side-console-header">
          <div>
            <p className="eyebrow">设置</p>
            <h2>桌面设置</h2>
          </div>
          <button className="icon-button quiet" type="button" aria-label="返回研究视图" onClick={() => props.onSelectConsoleMode('research')}>
            <PanelLeftClose size={18} />
          </button>
        </header>
        <div className="side-console-body">
          <DesktopSettings
            value={props.desktopSettings}
            onChange={props.onUpdateDesktopSettings}
            onSave={() => props.onSelectConsoleMode('research')}
            onClose={() => props.onSelectConsoleMode('research')}
          />
        </div>
      </aside>
    )
  }

  if (!props.project || !props.thread) {
    return (
      <aside className="side-console" aria-label="工作区">
        <div className="side-console-placeholder">
          <CircleHelp size={22} />
          <p>选择一个对话后，这里会显示对应的工作面板。</p>
        </div>
      </aside>
    )
  }

  const { project, thread } = props

  if (thread.mode === 'idea') {
    return <PapersWorkspace project={project} onUpdateProject={props.onUpdateProject} />
  }

  if (thread.mode === 'experiment') {
    return <RemoteWorkspace />
  }

  const title = thread.mode === 'figure' ? '画图' : '写作'
  const body =
    thread.mode === 'figure'
      ? '图表规划文档可以从对话区的「文档」入口打开。'
      : '写作草稿可以从对话区的「文档」入口打开。'

  return (
    <aside className="side-console" aria-label="工作区">
      <header className="side-console-header">
        <div>
          <p className="eyebrow">{thread.mode === 'figure' ? 'FIGURE' : 'WRITING'}</p>
          <h2>{title}</h2>
        </div>
      </header>
      <div className="side-console-placeholder">
        <FileText size={22} />
        <p>{body}</p>
      </div>
    </aside>
  )
}

function PapersWorkspace({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  return (
    <aside className="side-console" aria-label="论文库">
      <header className="side-console-header">
        <div>
          <p className="eyebrow">PAPERS</p>
          <h2>论文库</h2>
        </div>
      </header>
      <div className="side-console-body papers-body">
        <PaperDropGroup
          title="泛读论文"
          hint="上传泛读 PDF"
          category="skim-read"
          project={project}
          onUpdateProject={onUpdateProject}
        />
        <PaperDropGroup
          title="精读论文"
          hint="上传精读 PDF"
          category="deep-read"
          project={project}
          onUpdateProject={onUpdateProject}
        />
      </div>
    </aside>
  )
}

function PaperDropGroup({
  title,
  hint,
  category,
  project,
  onUpdateProject,
}: {
  title: string
  hint: string
  category: PaperCategory
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const papers: SourceRecord[] = project.sources.filter(
    (source) => source.kind === (category === 'deep-read' ? 'baseline' : 'reference'),
  )

  function handleSelect() {
    if (typeof window.electronAPI?.selectFile !== 'function') return
    void window.electronAPI.selectFile().then((filePath: string | null) => {
      if (filePath) setSelectedFile(filePath)
    })
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return
    setUploading(true)
    try {
      const papersDir = `${project.id}/papers`
      const result = await window.electronAPI.uploadPaper(selectedFile, papersDir, category)
      if (result.success) {
        const createdAt = Date.now()
        const fileName = selectedFile.split(/[/\\]/).pop() ?? selectedFile
        onUpdateProject({
          ...project,
          updatedAt: createdAt,
          sources: [
            ...project.sources,
            {
              id: `source-${project.sources.length + 1}`,
              projectId: project.id,
              kind: category === 'deep-read' ? 'baseline' : 'reference',
              title: result.metadata?.title ?? fileName,
              url: selectedFile,
              uncertainty: '',
              notes: `PDF文件: ${fileName}`,
              createdAt,
            },
          ],
        })
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Failed to upload paper:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="paper-drop-group">
      <div className="paper-drop-head">
        <BookOpen size={15} />
        <h3>{title}</h3>
        <small>{papers.length}</small>
      </div>

      {selectedFile ? (
        <div className="paper-selected-file">
          <FileText size={15} />
          <span>{selectedFile.split(/[/\\]/).pop()}</span>
          <button type="button" aria-label="取消选择" onClick={() => setSelectedFile(null)}>
            <X size={14} />
          </button>
          <button type="button" className="paper-confirm" onClick={handleUpload} disabled={uploading}>
            {uploading ? '上传中…' : '上传'}
          </button>
        </div>
      ) : (
        <button type="button" className="paper-dropzone" onClick={handleSelect}>
          <Upload size={16} />
          <span>{hint}</span>
        </button>
      )}

      {papers.length > 0 ? (
        <ul className="paper-list">
          {papers.toReversed().map((paper) => (
            <li key={paper.id} title={paper.title}>
              <FileText size={13} />
              <span>{paper.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function RemoteWorkspace() {
  const remoteSnapshot: RemoteConsoleSnapshot = createRemoteConsoleSnapshot({
    serverName: 'Remote server',
    connection: {
      status: 'not-configured',
      label: 'No SSH host configured',
      details: 'Connect a server to view live GPU and run state.',
      lastCheckedAt: null,
    },
    gpus: [],
    run: {
      id: 'none',
      title: 'No remote run selected',
      status: 'unknown',
      stage: 'Not connected',
      progress: null,
      currentStep: null,
      lastUpdateAt: null,
      blockers: ['Remote execution is not connected.'],
    },
    artifacts: [],
    notes: ['Live GPU metrics and server actions will appear after a local SSH adapter is configured.'],
  })

  return (
    <aside className="side-console" aria-label="远程连接">
      <header className="side-console-header">
        <div>
          <p className="eyebrow">REMOTE</p>
          <h2>远程连接</h2>
        </div>
      </header>
      <div className="side-console-body remote-body">
        <RemoteConsole snapshot={remoteSnapshot} />
      </div>
    </aside>
  )
}
