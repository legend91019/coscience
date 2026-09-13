import { FileText, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ConsoleEditor, type EditorTabId } from './ConsoleEditor.tsx'
import type { WorkspaceProjectBundle, WorkspaceThread } from '../domain-adapter.ts'

type ChatPanelProps = {
  project: WorkspaceProjectBundle | null
  thread: WorkspaceThread | null
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}

export function ChatPanel({ project, thread, onUpdateProject }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTab, setEditorTab] = useState<EditorTabId>('hypothesis')

  const notes = project && thread ? project.notes.filter((item) => item.threadId === thread.id) : []
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [notes.length])

  if (!project || !thread) {
    return (
      <section className="chat-panel" aria-label="对话">
        <div className="chat-empty">
          <PenLine size={22} />
          <p>新建或选择一个对话开始讨论。</p>
        </div>
      </section>
    )
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    const createdAt = Date.now()
    onUpdateProject({
      ...project!,
      updatedAt: createdAt,
      notes: [
        ...project!.notes,
        {
          id: `note-${project!.notes.length + 1}`,
          projectId: project!.id,
          threadId: thread!.id,
          body: draft.trim(),
          createdAt,
        },
      ],
    })
    setDraft('')
  }

  function openDocuments() {
    setEditorTab(thread!.mode === 'experiment' ? 'node' : 'hypothesis')
    setEditorOpen(true)
  }

  return (
    <section className="chat-panel" aria-label="对话">
      <header className="chat-header">
        <div>
          <p className="eyebrow">{labelForType(thread.mode)}</p>
          <h2>{thread.title}</h2>
        </div>
        <button className="docs-button" type="button" onClick={openDocuments}>
          <FileText size={14} />
          <span>文档</span>
        </button>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {notes.length === 0 ? (
          <div className="chat-empty">
            <PenLine size={22} />
            <p>开始对话。记录的想法、观察与结论都会留在这条讨论里。</p>
          </div>
        ) : (
          notes.map((note) => (
            <article className="chat-bubble" key={note.id}>
              <time>{formatDate(note.createdAt)}</time>
              <p>{note.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-composer" onSubmit={submitNote}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder="输入消息…"
          aria-label="对话输入"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="发送">
          <PenLine size={15} />
        </button>
      </form>

      {editorOpen ? (
        <ConsoleEditor
          mode={thread.mode === 'experiment' ? 'experiment' : 'idea'}
          project={project}
          onUpdateProject={onUpdateProject}
          tab={editorTab}
          onTabChange={setEditorTab}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </section>
  )
}

function labelForType(type: WorkspaceThread['mode']): string {
  if (!type) return '未定模式'
  return {
    idea: 'IDEA',
    experiment: '实验',
    figure: '画图',
    writing: '写作',
  }[type]
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
