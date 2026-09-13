import {
  BookOpen,
  CheckCircle2,
  FlaskConical,
  GitBranch,
  Lightbulb,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  appendEvidenceRecord,
  appendExperimentNode,
  appendHypothesisRevision,
  approveExperimentNodeDraft,
  draftFormalPromotion,
  reviewEvidenceRecord,
  selectBranchProposal,
  type EvidenceResult,
  type ExperimentGroup,
  type SourceRecord,
  type UiEvidenceRecord,
  type UiExperimentNode,
  type WorkspaceProjectBundle,
} from '../domain-adapter.ts'

export type EditorTabId = 'hypothesis' | 'sources' | 'node' | 'evidence' | 'decision'

type ConsoleEditorProps = {
  mode: 'idea' | 'experiment'
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
  tab: EditorTabId
  onTabChange: (tab: EditorTabId) => void
  onClose: () => void
}

const ideaTabs: Array<{ id: EditorTabId; label: string; icon: ReactNode }> = [
  { id: 'hypothesis', label: '假设文档', icon: <Lightbulb size={14} /> },
  { id: 'sources', label: '来源文档', icon: <BookOpen size={14} /> },
]

const experimentTabs: Array<{ id: EditorTabId; label: string; icon: ReactNode }> = [
  { id: 'node', label: '实验节点', icon: <FlaskConical size={14} /> },
  { id: 'evidence', label: '证据记录', icon: <ShieldCheck size={14} /> },
  { id: 'decision', label: '人工决策', icon: <GitBranch size={14} /> },
]

export function ConsoleEditor({ mode, project, onUpdateProject, tab, onTabChange, onClose }: ConsoleEditorProps) {
  const tabs = mode === 'idea' ? ideaTabs : experimentTabs
  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0]!.id

  return (
    <div className="editor-overlay" role="dialog" aria-label="研究文档" onClick={onClose}>
      <aside className="editor-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="editor-header">
          <div>
            <p className="eyebrow">文档</p>
            <h2>研究文档</h2>
          </div>
          <button className="icon-button quiet" type="button" aria-label="关闭文档" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <nav className="editor-tabs" aria-label="文档分栏">
          {tabs.map((item) => (
            <button
              className={item.id === activeTab ? 'selected' : ''}
              type="button"
              key={item.id}
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="editor-body">
          {mode === 'idea' && activeTab === 'hypothesis' ? (
            <HypothesisForm project={project} onUpdateProject={onUpdateProject} />
          ) : null}
          {mode === 'idea' && activeTab === 'sources' ? (
            <SourcesForm project={project} onUpdateProject={onUpdateProject} />
          ) : null}
          {mode === 'experiment' && activeTab === 'node' ? (
            <NodeForm project={project} onUpdateProject={onUpdateProject} />
          ) : null}
          {mode === 'experiment' && activeTab === 'evidence' ? (
            <EvidenceForm project={project} onUpdateProject={onUpdateProject} />
          ) : null}
          {mode === 'experiment' && activeTab === 'decision' ? (
            <DecisionForm project={project} onUpdateProject={onUpdateProject} />
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function HypothesisForm({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [question, setQuestion] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [theory, setTheory] = useState('')
  const [scope, setScope] = useState('')
  const [predictions, setPredictions] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim() || !hypothesis.trim()) return
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

  return (
    <section className="editor-section">
      <SectionTitle icon={<Lightbulb size={16} />} title="假设修订" />
      <form className="field-stack" onSubmit={submit}>
        <TextInput label="研究问题" value={question} onChange={setQuestion} />
        <TextArea label="假设" value={hypothesis} onChange={setHypothesis} />
        <TextArea label="理论依据" value={theory} onChange={setTheory} />
        <TextInput label="适用范围" value={scope} onChange={setScope} />
        <TextArea label="可验证预测" value={predictions} onChange={setPredictions} placeholder="每行一条预测" />
        <button type="submit">
          <Plus size={16} />
          保存修订
        </button>
      </form>
      <RecordList summary={`历史修订（${project.hypotheses.length}）`} empty="暂无假设修订。">
        {project.hypotheses.toReversed().map((item) => (
          <article className="record-item" key={item.id}>
            <strong>{item.hypothesis}</strong>
            <span>{item.researchQuestion}</span>
            <small>{item.scope || '未记录适用范围'}</small>
          </article>
        ))}
      </RecordList>
    </section>
  )
}

function SourcesForm({
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sourceTitle.trim()) return
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
    <section className="editor-section">
      <SectionTitle icon={<BookOpen size={16} />} title="记录来源" />
      <div className="segmented-control" role="group" aria-label="Source kind">
        <button className={sourceKind === 'reference' ? 'selected' : ''} type="button" onClick={() => setSourceKind('reference')}>
          泛读
        </button>
        <button className={sourceKind === 'baseline' ? 'selected' : ''} type="button" onClick={() => setSourceKind('baseline')}>
          精读
        </button>
      </div>
      <form className="field-stack" onSubmit={submit}>
        <TextInput label="标题" value={sourceTitle} onChange={setSourceTitle} />
        <TextInput label="来源链接" value={sourceUrl} onChange={setSourceUrl} />
        <TextInput label="不确定性" value={sourceUncertainty} onChange={setSourceUncertainty} />
        <TextArea label="备注" value={sourceNotes} onChange={setSourceNotes} />
        <button type="submit">
          <Plus size={16} />
          添加来源
        </button>
      </form>
      <RecordList summary={`已保存的来源（${project.sources.length}）`} empty="暂无来源记录。">
        {project.sources.toReversed().map((source) => (
          <article className="record-item" key={source.id}>
            <strong>{source.title}</strong>
            <span>{source.url || '未记录链接'}</span>
            <small>{source.kind === 'reference' ? '泛读' : '精读'} · {source.uncertainty || '未记录不确定性'}</small>
          </article>
        ))}
      </RecordList>
    </section>
  )
}

function NodeForm({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [group, setGroup] = useState<ExperimentGroup>('pilot')
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [plan, setPlan] = useState('')
  const [expected, setExpected] = useState('')
  const [criteria, setCriteria] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    const updated = appendExperimentNode(project, {
      group,
      title: title.trim(),
      validationQuestion: question.trim(),
      plan: plan.trim(),
      expectedResult: expected.trim(),
      acceptanceCriteria: splitLines(criteria),
    })
    onUpdateProject(updated.project)
    setTitle('')
    setQuestion('')
    setPlan('')
    setExpected('')
    setCriteria('')
  }

  function approveNode(nodeId: string) {
    onUpdateProject(approveExperimentNodeDraft(project, nodeId))
  }

  return (
    <section className="editor-section">
      <SectionTitle icon={<FlaskConical size={16} />} title="实验节点" />
      <div className="segmented-control" role="group" aria-label="实验组别">
        <button className={group === 'pilot' ? 'selected' : ''} type="button" onClick={() => setGroup('pilot')}>
          复现 / 小规模
        </button>
        <button className={group === 'formal' ? 'selected' : ''} type="button" onClick={() => setGroup('formal')}>
          正式
        </button>
      </div>
      <form className="field-stack" onSubmit={submit}>
        <TextInput label="标题" value={title} onChange={setTitle} />
        <TextArea label="验证问题" value={question} onChange={setQuestion} />
        <TextArea label="方案" value={plan} onChange={setPlan} />
        <TextArea label="预期结果" value={expected} onChange={setExpected} />
        <TextArea label="验收标准" value={criteria} onChange={setCriteria} placeholder="每行一条标准" />
        <button type="submit">
          <Plus size={16} />
          草拟节点
        </button>
      </form>
      <RecordList summary={`已保存节点（${project.nodes.length}）`} empty="暂无实验节点。">
        {project.nodes.toReversed().map((node) => (
          <article className="record-item" key={node.id}>
            <strong>{node.title}</strong>
            <span>
              {node.group} · {node.status}
            </span>
            <small>{node.validationQuestion || '未记录验证问题'}</small>
            {node.status === 'draft' ? (
              <div className="button-row">
                <button type="button" onClick={() => approveNode(node.id)}>
                  批准
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </RecordList>
    </section>
  )
}

function EvidenceForm({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const approvedNodes = project.nodes.filter((node) => node.status !== 'draft')
  const [evidenceNodeId, setEvidenceNodeId] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [evidenceResult, setEvidenceResult] = useState<EvidenceResult>('inconclusive')
  const [sourceRun, setSourceRun] = useState('')
  const [limitations, setLimitations] = useState('')

  const selectedNode = approvedNodes.find((node) => node.id === evidenceNodeId) ?? approvedNodes[0] ?? null
  const selectedEvidence = selectedNode
    ? project.evidences.filter((evidence) => evidence.nodeId === selectedNode.id)
    : []

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nodeId = selectedNode?.id
    if (!nodeId || !evidenceSummary.trim()) return
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

  return (
    <section className="editor-section">
      <SectionTitle icon={<ShieldCheck size={16} />} title="证据记录" />
      <NodeSelector nodes={approvedNodes} selectedNodeId={selectedNode?.id ?? ''} onSelect={setEvidenceNodeId} />
      {selectedNode ? (
        <>
          <form className="field-stack" onSubmit={submit}>
            <TextArea label="证据摘要" value={evidenceSummary} onChange={setEvidenceSummary} />
            <label className="field-label">
              结果
              <select value={evidenceResult} onChange={(event) => setEvidenceResult(event.currentTarget.value as EvidenceResult)}>
                <option value="positive">正向</option>
                <option value="negative">负向</option>
                <option value="inconclusive">不确定</option>
              </select>
            </label>
            <TextInput label="来源运行 / 产物" value={sourceRun} onChange={setSourceRun} />
            <TextArea label="局限" value={limitations} onChange={setLimitations} />
            <button type="submit">
              <Plus size={16} />
              记录证据
            </button>
          </form>
          <RecordList summary={`当前节点证据（${selectedEvidence.length}）`} empty="当前节点暂无证据。">
            {selectedEvidence.map((evidence) => (
              <article className="record-item evidence-item" key={evidence.id}>
                <strong>{evidence.summary}</strong>
                <span>
                  {evidence.result} · {evidence.reviewStatus}
                </span>
                <small>{evidence.sourceRun || '未记录来源运行'}</small>
                {evidence.limitations ? <small>{evidence.limitations}</small> : null}
                {evidence.reviewStatus === 'pending' ? (
                  <div className="button-row">
                    <button type="button" onClick={() => reviewEvidence(evidence.id, 'accepted')}>
                      通过
                    </button>
                    <button type="button" onClick={() => reviewEvidence(evidence.id, 'rejected')}>
                      驳回
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </RecordList>
        </>
      ) : (
        <p className="quiet-copy">先草拟并批准一个实验节点，再记录证据。</p>
      )}
    </section>
  )
}

function DecisionForm({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const pilotNodes = project.nodes.filter((node) => node.group === 'pilot')
  const approvedNodes = project.nodes.filter((node) => node.status !== 'draft')
  const [branchTitle, setBranchTitle] = useState('')
  const [branchRationale, setBranchRationale] = useState('')
  const [branchCost, setBranchCost] = useState('')
  const [branchUncertainty, setBranchUncertainty] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedEvidence = project.evidences.filter((evidence) => evidence.reviewStatus === 'accepted')
    const nodeId = approvedNodes[0]?.id
    if (!nodeId || !branchTitle.trim() || selectedEvidence.length === 0) return
    const updated = selectBranchProposal(project, {
      nodeId,
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
    <section className="editor-section">
      <SectionTitle icon={<GitBranch size={16} />} title="人工决策" />
      <form className="field-stack" onSubmit={submit}>
        <TextInput label="分支标题" value={branchTitle} onChange={setBranchTitle} />
        <TextArea label="人工理由" value={branchRationale} onChange={setBranchRationale} />
        <TextInput label="预估成本" value={branchCost} onChange={setBranchCost} />
        <TextInput label="不确定性" value={branchUncertainty} onChange={setBranchUncertainty} />
        <button type="submit">
          <GitBranch size={16} />
          记录决策
        </button>
      </form>
      <RecordList summary={`已记录的决策（${project.decisions.length}）`} empty="暂无人工决策。">
        {project.decisions.toReversed().map((decision) => (
          <article className="record-item" key={decision.id}>
            <strong>{decision.branchTitle}</strong>
            <span>{decision.rationale || '未记录理由'}</span>
            <small>
              {decision.expectedCost || '未估算成本'} · {decision.uncertainty || '未记录不确定性'}
            </small>
          </article>
        ))}
      </RecordList>
      {pilotNodes.length > 0 ? (
        <div className="promotion-list">
          {pilotNodes.map((node) => (
            <button type="button" key={node.id} onClick={() => promotePilot(node)}>
              <CheckCircle2 size={16} />
              从 {node.title} 起草正式实验
            </button>
          ))}
        </div>
      ) : null}
    </section>
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
      节点
      <select value={selectedNodeId} onChange={(event) => onSelect(event.currentTarget.value)}>
        {nodes.length === 0 ? <option value="">暂无节点</option> : null}
        {nodes.map((node) => (
          <option value={node.id} key={node.id}>
            {node.title} ({node.group})
          </option>
        ))}
      </select>
    </label>
  )
}

function RecordList({ summary, empty, children }: { summary: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.flat() : [children]
  const hasItems = items.filter(Boolean).length > 0
  return (
    <details className="console-details" open={!hasItems}>
      <summary>{summary}</summary>
      {hasItems ? <div className="record-list">{children}</div> : <p className="quiet-copy">{empty}</p>}
    </details>
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

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}
