import { Beaker, BookOpen, CheckCircle2, FileText, FlaskConical, GitBranch, Lightbulb, Plus, ShieldCheck, Server } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { DesktopSettings, type DesktopSettingsState } from './DesktopSettings.tsx'
import { RemoteConsole } from '../../remote/RemoteConsole.tsx'
import { createRemoteConsoleSnapshot } from '../../remote/console.ts'
import type { RemoteConsoleSnapshot } from '../../remote/console.ts'
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
  type UiHypothesisRevision,
  type WorkspaceProjectBundle,
  type WorkspaceThread,
} from '../domain-adapter.ts'

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
      <aside className="control-console" aria-label="工作区控制台">
        <div className="console-toolbar">
          <TabButton active={false} label="研究" onClick={() => props.onSelectConsoleMode('research')} />
          <TabButton active label="设置" onClick={() => props.onSelectConsoleMode('settings')} />
        </div>
        <DesktopSettings
          value={props.desktopSettings}
          onChange={props.onUpdateDesktopSettings}
          onSave={() => props.onSelectConsoleMode('research')}
          onClose={() => props.onSelectConsoleMode('research')}
        />
      </aside>
    )
  }

  if (!props.project || !props.thread) {
    return (
      <aside className="control-console" aria-label="工作区控制台">
        <div className="console-empty">当前没有可用控制台。</div>
      </aside>
    )
  }

  if (props.thread.type === 'idea') {
    return (
      <aside className="control-console" aria-label="工作区控制台">
        <div className="console-toolbar">
          <TabButton active label="研究" onClick={() => props.onSelectConsoleMode('research')} />
          <TabButton active={false} label="设置" onClick={() => props.onSelectConsoleMode('settings')} />
        </div>
        <IdeaConsole project={props.project} onUpdateProject={props.onUpdateProject} />
      </aside>
    )
  }

  if (props.thread.type === 'experiment') {
    return (
      <aside className="control-console" aria-label="工作区控制台">
        <div className="console-toolbar">
          <TabButton active label="研究" onClick={() => props.onSelectConsoleMode('research')} />
          <TabButton active={false} label="设置" onClick={() => props.onSelectConsoleMode('settings')} />
        </div>
        <ExperimentConsole project={props.project} onUpdateProject={props.onUpdateProject} />
      </aside>
    )
  }

  if (props.thread.type === 'figure') {
    return (
      <aside className="control-console" aria-label="工作区控制台">
        <div className="console-toolbar">
          <TabButton active label="研究" onClick={() => props.onSelectConsoleMode('research')} />
          <TabButton active={false} label="设置" onClick={() => props.onSelectConsoleMode('settings')} />
        </div>
        <DeferredConsole
          icon={<FileText size={24} />}
          title="画图"
          body="当前版本仅支持手动图表规划。图表生成桥接尚未接入。"
          onJump={() => props.onSelectThread(`${props.project.id}-pilot`)}
        />
      </aside>
    )
  }

  return (
    <aside className="control-console" aria-label="工作区控制台">
      <div className="console-toolbar">
        <TabButton active label="研究" onClick={() => props.onSelectConsoleMode('research')} />
        <TabButton active={false} label="设置" onClick={() => props.onSelectConsoleMode('settings')} />
      </div>
      <DeferredConsole
        icon={<BookOpen size={24} />}
        title="写作"
        body="写作草稿可以引用已验收的证据，但自动论文生成桥接尚未接入。"
        onJump={() => props.onSelectThread(`${props.project.id}-idea`)}
      />
    </aside>
  )
}

function IdeaConsole({
  project,
  onUpdateProject,
}: {
  project: WorkspaceProjectBundle
  onUpdateProject: (project: WorkspaceProjectBundle) => void
}) {
  const [tab, setTab] = useState<'hypothesis' | 'sources'>('hypothesis')
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

  function submitSource(event: FormEvent<HTMLFormElement>) {
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
    <div className="console-stack">
      <div className="segmented-control segmented-control--tabs" role="tablist" aria-label="Idea panel">
        <button className={tab === 'hypothesis' ? 'selected' : ''} type="button" onClick={() => setTab('hypothesis')}>
          假设
        </button>
        <button className={tab === 'sources' ? 'selected' : ''} type="button" onClick={() => setTab('sources')}>
          来源
        </button>
      </div>

      {tab === 'hypothesis' ? (
        <section className="console-section">
          <SectionTitle icon={<Lightbulb size={18} />} title="假设草稿" />
          <form className="field-stack" onSubmit={submitHypothesis}>
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
          <details className="console-details" open={project.hypotheses.length === 0}>
            <summary>已保存的假设修订</summary>
            <HypothesisList hypotheses={project.hypotheses} />
          </details>
        </section>
      ) : (
        <section className="console-section">
          <SectionTitle icon={<BookOpen size={18} />} title="参考与 Baseline" />
          <div className="segmented-control" role="group" aria-label="Source kind">
            <button className={sourceKind === 'reference' ? 'selected' : ''} type="button" onClick={() => setSourceKind('reference')}>
              泛读
            </button>
            <button className={sourceKind === 'baseline' ? 'selected' : ''} type="button" onClick={() => setSourceKind('baseline')}>
              精读
            </button>
          </div>
          <form className="field-stack" onSubmit={submitSource}>
            <TextInput label="标题" value={sourceTitle} onChange={setSourceTitle} />
            <TextInput label="来源链接" value={sourceUrl} onChange={setSourceUrl} />
            <TextInput label="不确定性" value={sourceUncertainty} onChange={setSourceUncertainty} />
            <TextArea label="备注" value={sourceNotes} onChange={setSourceNotes} />
            <button type="submit">
              <Plus size={16} />
              添加来源
            </button>
          </form>
          <details className="console-details" open={project.sources.length === 0}>
            <summary>已保存的来源</summary>
            <SourceList sources={project.sources} />
          </details>
        </section>
      )}
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
  const [tab, setTab] = useState<'node' | 'evidence' | 'decision' | 'remote'>('node')
  const pilotNodes = project.nodes.filter((node) => node.group === 'pilot')
  const approvedNodes = project.nodes.filter((node) => node.status !== 'draft')
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
  const remoteSnapshot: RemoteConsoleSnapshot = useMemo(
    () =>
      createRemoteConsoleSnapshot({
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
      }),
    [],
  )

  const selectedNode = approvedNodes.find((node) => node.id === evidenceNodeId) ?? approvedNodes[0] ?? null
  const selectedEvidence = selectedNode ? project.evidences.filter((evidence) => evidence.nodeId === selectedNode.id) : []

  function submitNode(event: FormEvent<HTMLFormElement>) {
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

  function approveNode(nodeId: string) {
    onUpdateProject(approveExperimentNodeDraft(project, nodeId))
  }

  function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedNode || !branchTitle.trim() || selectedEvidence.length === 0) return
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
      <div className="segmented-control segmented-control--tabs" role="tablist" aria-label="实验面板">
        <button className={tab === 'node' ? 'selected' : ''} type="button" onClick={() => setTab('node')}>
          节点
        </button>
        <button className={tab === 'evidence' ? 'selected' : ''} type="button" onClick={() => setTab('evidence')}>
          证据
        </button>
        <button className={tab === 'decision' ? 'selected' : ''} type="button" onClick={() => setTab('decision')}>
          决策
        </button>
        <button className={tab === 'remote' ? 'selected' : ''} type="button" onClick={() => setTab('remote')}>
          远程
        </button>
      </div>

      {tab === 'remote' ? (
        <section className="console-section">
          <SectionTitle icon={<Server size={18} />} title="远程实验控制台" />
          <RemoteConsole snapshot={remoteSnapshot} />
        </section>
      ) : null}

      {tab === 'node' ? (
        <section className="console-section">
          <SectionTitle icon={<FlaskConical size={18} />} title="实验节点" />
          <div className="segmented-control" role="group" aria-label="实验组别">
            <button className={group === 'pilot' ? 'selected' : ''} type="button" onClick={() => setGroup('pilot')}>
              复现 / 小规模
            </button>
            <button className={group === 'formal' ? 'selected' : ''} type="button" onClick={() => setGroup('formal')}>
              正式
            </button>
          </div>
          <form className="field-stack" onSubmit={submitNode}>
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
          <details className="console-details" open={project.nodes.length === 0}>
            <summary>已保存节点</summary>
            <NodeRoster nodes={project.nodes} onApprove={approveNode} />
          </details>
        </section>
      ) : null}

      {tab === 'evidence' ? (
        <section className="console-section">
          <SectionTitle icon={<ShieldCheck size={18} />} title="证据验收" />
          <NodeSelector nodes={approvedNodes} selectedNodeId={selectedNode?.id ?? ''} onSelect={setEvidenceNodeId} />
          {selectedNode ? (
            <>
              <form className="field-stack" onSubmit={submitEvidence}>
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
              <details className="console-details" open={selectedEvidence.length === 0}>
                <summary>当前节点证据</summary>
                <EvidenceList evidences={selectedEvidence} onReview={reviewEvidence} />
              </details>
            </>
          ) : (
            <p className="quiet-copy">先草拟并批准一个实验节点，再记录证据。</p>
          )}
        </section>
      ) : null}

      {tab === 'decision' ? (
        <section className="console-section">
          <SectionTitle icon={<GitBranch size={18} />} title="人工决策" />
          <form className="field-stack" onSubmit={submitBranch}>
            <TextInput label="分支标题" value={branchTitle} onChange={setBranchTitle} />
            <TextArea label="人工理由" value={branchRationale} onChange={setBranchRationale} />
            <TextInput label="预估成本" value={branchCost} onChange={setBranchCost} />
            <TextInput label="不确定性" value={branchUncertainty} onChange={setBranchUncertainty} />
            <button type="submit">
              <GitBranch size={16} />
              记录决策
            </button>
          </form>
          <details className="console-details" open={project.decisions.length === 0}>
            <summary>已记录的决策</summary>
            <DecisionList decisions={project.decisions} />
          </details>
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
      ) : null}
    </div>
  )
}

function HypothesisList({ hypotheses }: { hypotheses: UiHypothesisRevision[] }) {
  if (hypotheses.length === 0) return <p className="quiet-copy">暂无假设修订。</p>
  return (
    <div className="record-list">
      {hypotheses.toReversed().map((item) => (
        <article className="record-item" key={item.id}>
          <strong>{item.hypothesis}</strong>
          <span>{item.researchQuestion}</span>
          <small>{item.scope || '未记录适用范围'}</small>
        </article>
      ))}
    </div>
  )
}

function SourceList({ sources }: { sources: SourceRecord[] }) {
  if (sources.length === 0) return <p className="quiet-copy">暂无来源记录。</p>
  return (
    <div className="record-list">
      {sources.map((source) => (
        <article className="record-item" key={source.id}>
          <strong>{source.title}</strong>
          {source.url ? <a href={source.url}>{source.url}</a> : <span>未记录链接</span>}
          <small>
            {source.kind === 'reference' ? '泛读' : '精读'} · {source.uncertainty || '未记录不确定性'}
          </small>
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
  if (evidences.length === 0) return <p className="quiet-copy">当前节点暂无证据。</p>
  return (
    <div className="record-list">
      {evidences.map((evidence) => (
        <article className="record-item evidence-item" key={evidence.id}>
          <strong>{evidence.summary}</strong>
          <span>
            {evidence.result} · {evidence.reviewStatus}
          </span>
          <small>{evidence.sourceRun || '未记录来源运行'}</small>
          {evidence.limitations ? <small>{evidence.limitations}</small> : null}
          {evidence.reviewStatus === 'pending' ? (
            <div className="button-row">
              <button type="button" onClick={() => onReview(evidence.id, 'accepted')}>
                通过
              </button>
              <button type="button" onClick={() => onReview(evidence.id, 'rejected')}>
                驳回
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
  if (nodes.length === 0) return <p className="quiet-copy">暂无实验节点。</p>
  return (
    <div className="record-list">
      {nodes.toReversed().map((node) => (
        <article className="record-item" key={node.id}>
          <strong>{node.title}</strong>
          <span>
            {node.group} · {node.status}
          </span>
          <small>{node.validationQuestion || '未记录验证问题'}</small>
          {node.status === 'draft' ? (
            <div className="button-row">
              <button type="button" onClick={() => onApprove(node.id)}>
                批准
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function DecisionList({ decisions }: { decisions: WorkspaceProjectBundle['decisions'] }) {
  if (decisions.length === 0) return <p className="quiet-copy">暂无人工决策。</p>
  return (
    <div className="record-list">
      {decisions.toReversed().map((decision) => (
        <article className="record-item" key={decision.id}>
          <strong>{decision.branchTitle}</strong>
          <span>{decision.rationale || '未记录理由'}</span>
          <small>
            {decision.expectedCost || '未估算成本'} · {decision.uncertainty || '未记录不确定性'}
          </small>
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
        查看证据
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

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button className={active ? 'selected' : ''} type="button" onClick={onClick}>
      {label}
    </button>
  )
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}
