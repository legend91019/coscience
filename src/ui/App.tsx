import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Beaker,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  FileText,
  FlaskConical,
  GitBranch,
  Lightbulb,
  PenLine,
  Plus,
  Radio,
  ShieldCheck,
} from 'lucide-react'

import {
  appendEvidenceRecord,
  appendExperimentNode,
  appendHypothesisRevision,
  approveExperimentNodeDraft,
  createWorkspaceProject,
  draftFormalPromotion,
  reviewEvidenceRecord,
  selectBranchProposal,
} from './domain-adapter.ts'
import type {
  EvidenceResult,
  ExperimentGroup,
  SourceRecord,
  UiEvidenceRecord,
  UiExperimentNode,
  UiHypothesisRevision,
  WorkspaceProjectBundle,
  WorkspaceSnapshot,
  WorkspaceThread,
  WorkspaceType,
} from './domain-adapter.ts'
import {
  createBrowserWorkspaceRepository,
  createEmptyWorkspaceSnapshot,
  InvalidWorkspaceDataError,
} from './repository.ts'
import './App.css'

const repository =
  typeof window === 'undefined' ? null : createBrowserWorkspaceRepository(window.localStorage)

export function App() {
  const [initialWorkspace] = useState(loadInitialWorkspace)
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initialWorkspace.snapshot)
  const [storageWarning, setStorageWarning] = useState<string | null>(initialWorkspace.warning)

  useEffect(() => {
    if (repository) {
      repository.save(snapshot)
    }
  }, [snapshot])

  const activeProject = useMemo(() => {
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? null
    if (!project) {
      return null
    }
    return bundleFromSnapshot(snapshot, project.id)
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
    const project = createWorkspaceProject(`project-${snapshot.projects.length + 1}`, `Research workspace ${snapshot.projects.length + 1}`, createdAt)
    setSnapshot((current) =>
      mergeProjectBundle(
        {
          ...current,
          activeProjectId: project.id,
          activeThreadId: project.threads[0]?.id ?? null,
        },
        project,
        project.threads[0]?.id ?? null,
      ),
    )
  }

  function loadEmptyAfterInvalidData() {
    setStorageWarning(null)
    setSnapshot(createEmptyWorkspaceSnapshot())
  }

  return (
    <main className="coscience-shell">
      <aside className="project-rail" aria-label="Project navigation">
        <div className="rail-header">
          <div>
            <p className="eyebrow">CoScience</p>
            <h1>Evidence loop</h1>
          </div>
          <button className="icon-button" type="button" aria-label="Create project" onClick={createProject}>
            <Plus size={18} />
          </button>
        </div>

        <div className="connection-strip" aria-label="Runtime connection states">
          <StatusPill icon={<Radio size={14} />} label="Server" value={snapshot.runtime.server} />
          <StatusPill icon={<CircleAlert size={14} />} label="Model" value={snapshot.runtime.model} />
        </div>

        <nav className="project-list" aria-label="Projects">
          {snapshot.projects.length === 0 ? (
            <button className="project-row empty-action" type="button" onClick={createProject}>
              <Plus size={16} />
              Create local workspace
            </button>
          ) : (
            snapshot.projects.map((project) => (
              <button
                className={project.id === snapshot.activeProjectId ? 'project-row selected' : 'project-row'}
                type="button"
                key={project.id}
                onClick={() =>
                  setSnapshot((current) => ({
                    ...current,
                    activeProjectId: project.id,
                    activeThreadId: current.threads.find((thread) => thread.projectId === project.id)?.id ?? null,
                  }))
                }
              >
                <span>{project.name}</span>
                <small>{project.summary}</small>
              </button>
            ))
          )}
        </nav>

        {activeProject ? (
          <ThreadNavigator
            project={activeProject}
            activeThreadId={activeThread?.id ?? null}
            onSelect={(threadId) => setSnapshot((current) => ({ ...current, activeThreadId: threadId }))}
          />
        ) : null}
      </aside>

      <section className="conversation-panel" aria-label="Workspace discussion">
        {storageWarning ? (
          <div className="warning-banner">
            <CircleAlert size={18} />
            <span>{storageWarning}</span>
            <button type="button" onClick={loadEmptyAfterInvalidData}>
              Start clean
            </button>
          </div>
        ) : null}

        {activeProject && activeThread ? (
          <DiscussionColumn
            project={activeProject}
            thread={activeThread}
            onUpdateProject={updateProject}
          />
        ) : (
          <div className="empty-state wide">
            <Lightbulb size={28} />
            <h2>No active project</h2>
            <p>Create a local workspace to start recording hypotheses, evidence, and human decisions.</p>
            <button type="button" onClick={createProject}>
              <Plus size={16} />
              Create workspace
            </button>
          </div>
        )}
      </section>

      <aside className="control-console" aria-label="Workspace control console">
        {activeProject && activeThread ? (
          <WorkspaceConsole
            project={activeProject}
            thread={activeThread}
            onUpdateProject={updateProject}
            onSelectThread={(threadId) => setSnapshot((current) => ({ ...current, activeThreadId: threadId }))}
          />
        ) : (
          <div className="console-empty">No console is active.</div>
        )}
      </aside>
    </main>
  )

}

function ThreadNavigator({
  project,
  activeThreadId,
  onSelect,
}: {
  project: WorkspaceProjectBundle
  activeThreadId: string | null
  onSelect: (threadId: string) => void
}) {
  const formalNodes = project.nodes.filter((node) => node.group === 'formal')
  const pilotNodes = project.nodes.filter((node) => node.group === 'pilot')
  const approvedNodes = project.nodes.filter((node) => node.status !== 'draft')

  return (
    <div className="thread-nav">
      {project.threads.map((thread) => (
        <button
          type="button"
          className={thread.id === activeThreadId ? 'thread-row selected' : 'thread-row'}
          key={thread.id}
          onClick={() => onSelect(thread.id)}
        >
          {threadIcon(thread.type)}
          <span>{thread.title}</span>
        </button>
      ))}

      <div className="experiment-tree" aria-label="Experiment groups">
        <p>Experiments</p>
        <ExperimentGroupList title="Reproduction and pilots" nodes={pilotNodes} />
        <ExperimentGroupList title="Formal experiments" nodes={formalNodes} />
      </div>
    </div>
  )
}

function ExperimentGroupList({ title, nodes }: { title: string; nodes: UiExperimentNode[] }) {
  return (
    <div className="experiment-group">
      <span>{title}</span>
      {nodes.length === 0 ? <small>No nodes yet</small> : nodes.map((node) => <small key={node.id}>{node.title}</small>)}
    </div>
  )
}

function DiscussionColumn({
  project,
  thread,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  thread: WorkspaceThread
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [note, setNote] = useState('')
  const notes = project.notes.filter((item) => item.threadId === thread.id)

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) {
      return
    }
    const createdAt = Date.now()
    onUpdateProject({
      ...project,
      updatedAt: createdAt,
      notes: [
        ...project.notes,
        {
          id: `note-${project.notes.length + 1}`,
          projectId: project.id,
          threadId: thread.id,
          body: note.trim(),
          createdAt,
        },
      ],
    })
    setNote('')
  }

  return (
    <>
      <header className="conversation-header">
        <div>
          <p className="eyebrow">{labelForType(thread.type)}</p>
          <h2>{thread.title}</h2>
        </div>
        <span>{project.name}</span>
      </header>

      <div className="message-stack">
        {notes.length === 0 ? (
          <div className="empty-state">
            <PenLine size={24} />
            <h3>Manual notes only</h3>
            <p>No AI execution is connected. Record the discussion, decision, or observation you want preserved.</p>
          </div>
        ) : (
          notes.map((item) => (
            <article className="note-bubble" key={item.id}>
              <time>{formatDate(item.createdAt)}</time>
              <p>{item.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="composer" onSubmit={submitNote}>
        <label htmlFor="discussion-note">Research note</label>
        <textarea
          id="discussion-note"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="Record a hypothesis update, evidence interpretation, or human decision rationale."
        />
        <button type="submit">
          <PenLine size={16} />
          Save note
        </button>
      </form>
    </>
  )
}

function WorkspaceConsole({
  project,
  thread,
  onUpdateProject,
  onSelectThread,
}: {
  project: WorkspaceProjectBundle
  thread: WorkspaceThread
  onUpdateProject: (project: WorkspaceProjectBundle) => void
  onSelectThread: (threadId: string) => void
}) {
  if (thread.type === 'idea') {
    return <IdeaConsole project={project} onUpdateProject={onUpdateProject} />
  }
  if (thread.type === 'experiment') {
    return <ExperimentConsole project={project} onUpdateProject={onUpdateProject} />
  }
  if (thread.type === 'figure') {
    return (
      <DeferredConsole
        icon={<FileText size={24} />}
        title="Figures"
        body="Figure planning is available as manual notes in this milestone. Plot generation is not connected."
        onJump={() => onSelectThread(`${project.id}-pilot`)}
      />
    )
  }
  return (
    <DeferredConsole
      icon={<BookOpen size={24} />}
      title="Writing"
      body="Writing drafts can reference accepted evidence here, but automatic paper generation is not connected."
      onJump={() => onSelectThread(`${project.id}-idea`)}
    />
  )
}

function IdeaConsole({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [sourceKind, setSourceKind] = useState<'reference' | 'baseline'>('reference')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceUncertainty, setSourceUncertainty] = useState('')
  const [sourceNotes, setSourceNotes] = useState('')
  const [question, setQuestion] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [theory, setTheory] = useState('')
  const [scope, setScope] = useState('')
  const [predictions, setPredictions] = useState('')

  function submitHypothesis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || !hypothesis.trim()) {
      return
    }
    const updated = appendHypothesisRevision(project, {
      researchQuestion: question.trim(),
      hypothesis: hypothesis.trim(),
      theory: theory.trim(),
      scope: scope.trim(),
      predictions: splitLines(predictions),
    })
    onUpdateProject(updated.project)
    setQuestion('')
    setHypothesis('')
    setTheory('')
    setScope('')
    setPredictions('')
  }

  function submitSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sourceTitle.trim()) {
      return
    }
    const createdAt = Date.now()
    const source: SourceRecord = {
      id: `source-${project.sources.length + 1}`,
      projectId: project.id,
      kind: sourceKind,
      title: sourceTitle.trim(),
      url: sourceUrl.trim(),
      uncertainty: sourceUncertainty.trim(),
      notes: sourceNotes.trim(),
      createdAt,
    }
    onUpdateProject({
      ...project,
      updatedAt: createdAt,
      sources: [...project.sources, source],
    })
    setSourceTitle('')
    setSourceUrl('')
    setSourceUncertainty('')
    setSourceNotes('')
  }

  return (
    <div className="console-stack">
      <section className="console-section">
        <SectionTitle icon={<Lightbulb size={18} />} title="Hypothesis" />
        <form className="field-stack" onSubmit={submitHypothesis}>
          <TextInput label="Research question" value={question} onChange={setQuestion} />
          <TextArea label="Hypothesis" value={hypothesis} onChange={setHypothesis} />
          <TextArea label="Theory basis" value={theory} onChange={setTheory} />
          <TextInput label="Scope" value={scope} onChange={setScope} />
          <TextArea label="Predictions" value={predictions} onChange={setPredictions} placeholder="One prediction per line" />
          <button type="submit">
            <Plus size={16} />
            Save revision
          </button>
        </form>
        <HypothesisList hypotheses={project.hypotheses} />
      </section>

      <section className="console-section">
        <SectionTitle icon={<BookOpen size={18} />} title="Sources" />
        <div className="segmented-control" role="group" aria-label="Source kind">
          <button className={sourceKind === 'reference' ? 'selected' : ''} type="button" onClick={() => setSourceKind('reference')}>
            Reference
          </button>
          <button className={sourceKind === 'baseline' ? 'selected' : ''} type="button" onClick={() => setSourceKind('baseline')}>
            Baseline
          </button>
        </div>
        <form className="field-stack" onSubmit={submitSource}>
          <TextInput label="Title" value={sourceTitle} onChange={setSourceTitle} />
          <TextInput label="Source link" value={sourceUrl} onChange={setSourceUrl} />
          <TextInput label="Uncertainty" value={sourceUncertainty} onChange={setSourceUncertainty} />
          <TextArea label="Notes" value={sourceNotes} onChange={setSourceNotes} />
          <button type="submit">
            <Plus size={16} />
            Add source
          </button>
        </form>
        <SourceList sources={project.sources} />
      </section>
    </div>
  )
}

function ExperimentConsole({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const pilotNodes = project.nodes.filter((node) => node.group === 'pilot')
  const [group, setGroup] = useState<ExperimentGroup>('pilot')
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [plan, setPlan] = useState('')
  const [expected, setExpected] = useState('')
  const [criteria, setCriteria] = useState('')
  const [evidenceNodeId, setEvidenceNodeId] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [evidenceResult, setEvidenceResult] = useState<EvidenceResult>('inconclusive')
  const [sourceRun, setSourceRun] = useState('')
  const [limitations, setLimitations] = useState('')
  const [branchTitle, setBranchTitle] = useState('')
  const [branchRationale, setBranchRationale] = useState('')
  const [branchCost, setBranchCost] = useState('')
  const [branchUncertainty, setBranchUncertainty] = useState('')

  const selectedNode = approvedNodes.find((node) => node.id === evidenceNodeId) ?? approvedNodes[0] ?? null
  const selectedEvidence = selectedNode ? project.evidences.filter((evidence) => evidence.nodeId === selectedNode.id) : []

  function submitNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      return
    }
    const updated = appendExperimentNode(project, {
      group,
      title: title.trim(),
      validationQuestion: question.trim(),
      plan: plan.trim(),
      expectedResult: expected.trim(),
      acceptanceCriteria: splitLines(criteria),
    })
    onUpdateProject(updated.project)
    setEvidenceNodeId(updated.node.id)
    setTitle('')
    setQuestion('')
    setPlan('')
    setExpected('')
    setCriteria('')
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nodeId = selectedNode?.id
    if (!nodeId || !evidenceSummary.trim()) {
      return
    }
    const updated = appendEvidenceRecord(project, {
      nodeId,
      summary: evidenceSummary.trim(),
      result: evidenceResult,
      sourceRun: sourceRun.trim(),
      limitations: limitations.trim(),
    })
    onUpdateProject(updated.project)
    setEvidenceSummary('')
    setSourceRun('')
    setLimitations('')
  }

  function reviewEvidence(evidenceId: string, status: 'accepted' | 'rejected') {
    onUpdateProject(reviewEvidenceRecord(project, evidenceId, status))
  }

  function approveNode(nodeId: string) {
    onUpdateProject(approveExperimentNodeDraft(project, nodeId))
  }

  function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedNode || !branchTitle.trim() || selectedEvidence.length === 0) {
      return
    }
    const updated = selectBranchProposal(project, {
      nodeId: selectedNode.id,
      title: branchTitle.trim(),
      triggerEvidenceIds: selectedEvidence.map((evidence) => evidence.id),
      rationale: branchRationale.trim(),
      expectedCost: branchCost.trim(),
      uncertainty: branchUncertainty.trim(),
      selectedBy: 'human',
    })
    onUpdateProject(updated.project)
    setBranchTitle('')
    setBranchRationale('')
    setBranchCost('')
    setBranchUncertainty('')
  }

  function promotePilot(node: UiExperimentNode) {
    const updated = draftFormalPromotion(project, {
      pilotNodeId: node.id,
      title: `Formal follow-up: ${node.title}`,
      plan: 'Freeze controls, seeds, comparisons, and reporting before execution.',
      acceptanceCriteria: ['Formal controls reviewed', 'Seed plan recorded', 'Evidence plan frozen'],
    })
    onUpdateProject(updated.project)
  }

  return (
    <div className="console-stack">
      <section className="console-section">
        <SectionTitle icon={<FlaskConical size={18} />} title="Experiment node" />
        <div className="segmented-control" role="group" aria-label="Experiment group">
          <button className={group === 'pilot' ? 'selected' : ''} type="button" onClick={() => setGroup('pilot')}>
            Pilot
          </button>
          <button className={group === 'formal' ? 'selected' : ''} type="button" onClick={() => setGroup('formal')}>
            Formal
          </button>
        </div>
        <form className="field-stack" onSubmit={submitNode}>
          <TextInput label="Title" value={title} onChange={setTitle} />
          <TextArea label="Validation question" value={question} onChange={setQuestion} />
          <TextArea label="Plan" value={plan} onChange={setPlan} />
          <TextArea label="Expected result" value={expected} onChange={setExpected} />
          <TextArea label="Acceptance criteria" value={criteria} onChange={setCriteria} placeholder="One criterion per line" />
          <button type="submit">
            <Plus size={16} />
            Draft node
          </button>
        </form>
        <NodeRoster nodes={project.nodes} onApprove={approveNode} />
      </section>

      <section className="console-section">
        <SectionTitle icon={<ShieldCheck size={18} />} title="Evidence review" />
        <NodeSelector nodes={approvedNodes} selectedNodeId={selectedNode?.id ?? ''} onSelect={setEvidenceNodeId} />
        {selectedNode ? (
          <>
            <form className="field-stack" onSubmit={submitEvidence}>
              <TextArea label="Evidence summary" value={evidenceSummary} onChange={setEvidenceSummary} />
              <label className="field-label">
                Result
                <select value={evidenceResult} onChange={(event) => setEvidenceResult(event.currentTarget.value as EvidenceResult)}>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
              </label>
              <TextInput label="Source run or artifact" value={sourceRun} onChange={setSourceRun} />
              <TextArea label="Limitations" value={limitations} onChange={setLimitations} />
              <button type="submit">
                <Plus size={16} />
                Record evidence
              </button>
            </form>
            <EvidenceList evidences={selectedEvidence} onReview={reviewEvidence} />
          </>
        ) : (
          <p className="quiet-copy">Draft an experiment node before recording evidence.</p>
        )}
      </section>

      <section className="console-section">
        <SectionTitle icon={<GitBranch size={18} />} title="Manual decision" />
        <form className="field-stack" onSubmit={submitBranch}>
          <TextInput label="Branch title" value={branchTitle} onChange={setBranchTitle} />
          <TextArea label="Human rationale" value={branchRationale} onChange={setBranchRationale} />
          <TextInput label="Expected cost" value={branchCost} onChange={setBranchCost} />
          <TextInput label="Uncertainty" value={branchUncertainty} onChange={setBranchUncertainty} />
          <button type="submit">
            <GitBranch size={16} />
            Record decision
          </button>
        </form>
        <DecisionList decisions={project.decisions} />
        {pilotNodes.length > 0 ? (
          <div className="promotion-list">
            {pilotNodes.map((node) => (
              <button type="button" key={node.id} onClick={() => promotePilot(node)}>
                <CheckCircle2 size={16} />
                Draft formal from {node.title}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function HypothesisList({ hypotheses }: { hypotheses: UiHypothesisRevision[] }) {
  if (hypotheses.length === 0) {
    return <p className="quiet-copy">No hypothesis revisions saved.</p>
  }

  return (
    <div className="record-list">
      {hypotheses.toReversed().map((item) => (
        <article className="record-item" key={item.id}>
          <strong>{item.hypothesis}</strong>
          <span>{item.researchQuestion}</span>
          <small>{item.scope || 'Scope not recorded'}</small>
        </article>
      ))}
    </div>
  )
}

function SourceList({ sources }: { sources: SourceRecord[] }) {
  if (sources.length === 0) {
    return <p className="quiet-copy">No source records saved.</p>
  }

  return (
    <div className="record-list">
      {sources.map((source) => (
        <article className="record-item" key={source.id}>
          <strong>{source.title}</strong>
          {source.url ? <a href={source.url}>{source.url}</a> : <span>No link recorded</span>}
          <small>{source.kind} · {source.uncertainty || 'Uncertainty not recorded'}</small>
        </article>
      ))}
    </div>
  )
}

function EvidenceList({
  evidences,
  onReview,
}: {
  evidences: UiEvidenceRecord[]
  onReview: (evidenceId: string, status: 'accepted' | 'rejected') => void
}) {
  if (evidences.length === 0) {
    return <p className="quiet-copy">No evidence recorded for this node.</p>
  }

  return (
    <div className="record-list">
      {evidences.map((evidence) => (
        <article className="record-item evidence-item" key={evidence.id}>
          <strong>{evidence.summary}</strong>
          <span>{evidence.result} · {evidence.reviewStatus}</span>
          <small>{evidence.sourceRun || 'Source run not recorded'}</small>
          {evidence.limitations ? <small>{evidence.limitations}</small> : null}
          {evidence.reviewStatus === 'pending' ? (
            <div className="button-row">
              <button type="button" onClick={() => onReview(evidence.id, 'accepted')}>
                Accept
              </button>
              <button type="button" onClick={() => onReview(evidence.id, 'rejected')}>
                Reject
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function NodeRoster({
  nodes,
  onApprove,
}: {
  nodes: UiExperimentNode[]
  onApprove: (nodeId: string) => void
}) {
  if (nodes.length === 0) {
    return <p className="quiet-copy">No experiment nodes drafted.</p>
  }

  return (
    <div className="record-list">
      {nodes.toReversed().map((node) => (
        <article className="record-item" key={node.id}>
          <strong>{node.title}</strong>
          <span>{node.group} · {node.status}</span>
          <small>{node.validationQuestion || 'Validation question not recorded'}</small>
          {node.status === 'draft' ? (
            <div className="button-row">
              <button type="button" onClick={() => onApprove(node.id)}>
                Approve
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function DecisionList({ decisions }: { decisions: WorkspaceProjectBundle['decisions'] }) {
  if (decisions.length === 0) {
    return <p className="quiet-copy">No human branch decisions recorded.</p>
  }

  return (
    <div className="record-list">
      {decisions.toReversed().map((decision) => (
        <article className="record-item" key={decision.id}>
          <strong>{decision.branchTitle}</strong>
          <span>{decision.rationale || 'No rationale recorded'}</span>
          <small>{decision.expectedCost || 'Cost not estimated'} · {decision.uncertainty || 'Uncertainty not recorded'}</small>
        </article>
      ))}
    </div>
  )
}

function NodeSelector({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: UiExperimentNode[]
  selectedNodeId: string
  onSelect: (nodeId: string) => void
}) {
  return (
    <label className="field-label">
      Node
      <select value={selectedNodeId} onChange={(event) => onSelect(event.currentTarget.value)}>
        {nodes.length === 0 ? <option value="">No nodes</option> : null}
        {nodes.map((node) => (
          <option value={node.id} key={node.id}>
            {node.title} ({node.group})
          </option>
        ))}
      </select>
    </label>
  )
}

function DeferredConsole({
  icon,
  title,
  body,
  onJump,
}: {
  icon: ReactNode
  title: string
  body: string
  onJump: () => void
}) {
  return (
    <div className="deferred-console">
      {icon}
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" onClick={onJump}>
        <Beaker size={16} />
        View evidence
      </button>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="section-title">
      {icon}
      <h3>{title}</h3>
    </div>
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

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field-label">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field-label">
      {label}
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function bundleFromSnapshot(snapshot: WorkspaceSnapshot, projectId: string): WorkspaceProjectBundle {
  const project = snapshot.projects.find((item) => item.id === projectId)
  if (!project) {
    throw new Error(`Project ${projectId} does not exist.`)
  }

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

function replaceProjectRecords<T extends { projectId: string }>(records: T[], projectId: string, replacements: T[]): T[] {
  return [...records.filter((item) => item.projectId !== projectId), ...replacements]
}

function upsertById<T extends { id: string }>(records: T[], replacement: T): T[] {
  const exists = records.some((item) => item.id === replacement.id)
  return exists ? records.map((item) => (item.id === replacement.id ? replacement : item)) : [...records, replacement]
}

function threadIcon(type: WorkspaceType) {
  if (type === 'idea') {
    return <Lightbulb size={16} />
  }
  if (type === 'experiment') {
    return <FlaskConical size={16} />
  }
  if (type === 'figure') {
    return <FileText size={16} />
  }
  return <BookOpen size={16} />
}

function labelForType(type: WorkspaceType): string {
  return {
    idea: 'Idea workspace',
    experiment: 'Experiment workspace',
    figure: 'Figure workspace',
    writing: 'Writing workspace',
  }[type]
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
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
        warning: 'Saved workspace data could not be loaded. It has not been cleared.',
      }
    }
    throw error
  }
}

export default App
