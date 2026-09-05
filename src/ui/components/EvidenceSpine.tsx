import { CircleAlert, PenLine, Plus, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WorkspaceProjectBundle, WorkspaceThread } from '../domain-adapter.ts'
import { evidenceSpineSteps } from './evidence-spine.ts'

type EvidenceSpineProps = {
  project: WorkspaceProjectBundle | null
  thread: WorkspaceThread | null
  storageWarning: string | null
  onUpdateProject: (project: WorkspaceProjectBundle) => void
  onResetWorkspace: () => void
}

export function EvidenceSpine(props: EvidenceSpineProps) {
  const [note, setNote] = useState('')

  if (!props.project || !props.thread) {
    return (
      <section className="conversation-panel" aria-label="工作区讨论">
        <div className="empty-state wide">
          <ShieldCheck size={28} />
          <h2>暂无活动项目</h2>
          <p>新建本地工作区后，就可以记录假设、证据和人工决策。</p>
        </div>
      </section>
    )
  }

  const notes = props.project.notes.filter((item) => item.threadId === props.thread?.id)
  const latestHypothesis = props.project.hypotheses.at(-1) ?? null
  const activeStep = activeStepForThread(props.thread.type)

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    const createdAt = Date.now()
    props.onUpdateProject({
      ...props.project,
      updatedAt: createdAt,
      notes: [
        ...props.project.notes,
        {
          id: `note-${props.project.notes.length + 1}`,
          projectId: props.project.id,
          threadId: props.thread.id,
          body: note.trim(),
          createdAt,
        },
      ],
    })
    setNote('')
  }

  return (
    <section className="conversation-panel evidence-panel" aria-label="工作区讨论">
      {props.storageWarning ? (
        <div className="warning-banner">
          <CircleAlert size={18} />
          <span>{props.storageWarning}</span>
          <button type="button" onClick={props.onResetWorkspace}>
            重新开始
          </button>
        </div>
      ) : null}

      <header className="conversation-header evidence-header">
        <div>
          <p className="eyebrow">{labelForType(props.thread.type)}</p>
          <h2>{threadTitle(props.thread.type)}</h2>
        </div>
        <span>{props.project.name}</span>
      </header>

      <div className="evidence-surface">
        <section className="spine-panel">
          <div className="spine-panel-head">
            <div>
              <p className="eyebrow">证据脊柱</p>
              <h3>研究路线</h3>
            </div>
            <span className="spine-chip">{activeStep.title}</span>
          </div>
          <div className="spine-track">
            {evidenceSpineSteps().map((step, index) => (
              <article className={`spine-step ${step.key === activeStep.key ? 'active' : ''}`} key={step.key}>
                <span className="spine-step-key">{String(index + 1).padStart(2, '0')}</span>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
          <div className="spine-notes">
            <div>
              <span className="spine-note-label">最近一次假设</span>
              <strong>{latestHypothesis?.hypothesis || '尚未记录假设修订'}</strong>
            </div>
            <div>
              <span className="spine-note-label">证据状态</span>
              <strong>{props.project.evidences.length > 0 ? `${props.project.evidences.length} 条记录` : '尚未记录证据'}</strong>
            </div>
          </div>
        </section>

        <section className="message-stack evidence-notes">
          {notes.length === 0 ? (
            <div className="empty-state">
              <PenLine size={24} />
              <h3>仅手动记录</h3>
              <p>当前未接入 AI 执行。你可以在这里记录讨论、决定或观察。</p>
            </div>
          ) : (
            notes.map((item) => (
              <article className="note-bubble" key={item.id}>
                <time>{formatDate(item.createdAt)}</time>
                <p>{item.body}</p>
              </article>
            ))
          )}
        </section>
      </div>

      <form className="composer evidence-composer" onSubmit={submitNote}>
        <label htmlFor="discussion-note">研究笔记</label>
        <textarea
          id="discussion-note"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="记录假设更新、证据解释或人工决策理由。"
        />
        <button type="submit">
          <Plus size={16} />
          保存笔记
        </button>
      </form>
    </section>
  )
}

function activeStepForThread(type: WorkspaceThread['type']) {
  if (type === 'idea') return evidenceSpineSteps()[0]!
  if (type === 'experiment') return evidenceSpineSteps()[1]!
  if (type === 'figure') return evidenceSpineSteps()[2]!
  return evidenceSpineSteps()[3]!
}

function labelForType(type: WorkspaceThread['type']): string {
  return {
    idea: 'Idea 对话',
    experiment: '实验对话',
    figure: '画图对话',
    writing: '写作对话',
  }[type]
}

function threadTitle(type: WorkspaceThread['type']): string {
  return {
    idea: 'Idea 与方向',
    experiment: '复现与小规模验证',
    figure: '画图',
    writing: '写作',
  }[type]
}

function formatDate(value: number): string {
  if (value === 0) {
    return 'time not recorded'
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
