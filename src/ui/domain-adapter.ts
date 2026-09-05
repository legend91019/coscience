export type WorkspaceType = 'idea' | 'experiment' | 'figure' | 'writing'
export type ExperimentGroup = 'pilot' | 'formal'
export type ExperimentNodeStatus = 'draft' | 'approved' | 'waiting-evidence' | 'accepted' | 'rejected'
export type EvidenceResult = 'positive' | 'negative' | 'inconclusive'
export type EvidenceReviewStatus = 'pending' | 'accepted' | 'rejected'
export type ConnectionState = 'not-configured' | 'disconnected' | 'connected' | 'unknown'
export type ModelState = 'not-configured' | 'ready'

export type WorkspaceProjectSummary = {
  id: string
  name: string
  summary: string
  updatedAt: number
}

export type WorkspaceThread = {
  id: string
  projectId: string
  type: WorkspaceType
  title: string
  summary: string
  updatedAt: number
}

export type ResearchNote = {
  id: string
  projectId: string
  threadId: string
  body: string
  createdAt: number
}

export type SourceRecord = {
  id: string
  projectId: string
  kind: 'reference' | 'baseline'
  title: string
  url: string
  uncertainty: string
  notes: string
  createdAt: number
}

export type UiHypothesisRevision = {
  id: string
  projectId: string
  previousRevisionId: string | null
  researchQuestion: string
  hypothesis: string
  theory: string
  scope: string
  predictions: string[]
  createdAt: number
}

export type UiExperimentNode = {
  id: string
  projectId: string
  group: ExperimentGroup
  hypothesisRevisionId: string | null
  title: string
  validationQuestion: string
  plan: string
  expectedResult: string
  acceptanceCriteria: string[]
  status: ExperimentNodeStatus
  createdAt: number
  sourcePilotNodeId?: string
  evidenceIds: string[]
}

export type UiExperimentRun = {
  id: string
  projectId: string
  nodeId: string
  label: string
  status: 'not-started' | 'running' | 'completed' | 'failed' | 'disconnected' | 'unknown'
  provenance: string
  createdAt: number
}

export type UiEvidenceRecord = {
  id: string
  projectId: string
  nodeId: string
  summary: string
  result: EvidenceResult
  sourceRun: string
  limitations: string
  reviewStatus: EvidenceReviewStatus
  createdAt: number
  reviewedAt?: number
}

export type UiHumanDecision = {
  id: string
  projectId: string
  nodeId: string
  branchTitle: string
  triggerEvidenceIds: string[]
  rationale: string
  expectedCost: string
  uncertainty: string
  selectedBy: string
  selectedAt: number
}

export type WorkspaceRuntimeState = {
  model: ModelState
  server: ConnectionState
  message: string
}

export type WorkspaceSnapshot = {
  activeProjectId: string | null
  activeThreadId: string | null
  runtime: WorkspaceRuntimeState
  projects: WorkspaceProjectSummary[]
  threads: WorkspaceThread[]
  notes: ResearchNote[]
  sources: SourceRecord[]
  hypotheses: UiHypothesisRevision[]
  nodes: UiExperimentNode[]
  runs: UiExperimentRun[]
  evidences: UiEvidenceRecord[]
  decisions: UiHumanDecision[]
}

export type WorkspaceProjectBundle = WorkspaceProjectSummary & {
  threads: WorkspaceThread[]
  notes: ResearchNote[]
  sources: SourceRecord[]
  hypotheses: UiHypothesisRevision[]
  nodes: UiExperimentNode[]
  runs: UiExperimentRun[]
  evidences: UiEvidenceRecord[]
  decisions: UiHumanDecision[]
}

export function createWorkspaceProject(id: string, name: string, createdAt = Date.now()): WorkspaceProjectBundle {
  const project: WorkspaceProjectSummary = {
    id,
    name,
    summary: 'Human-led evidence loop workspace.',
    updatedAt: createdAt,
  }

  return {
    ...project,
    threads: [
      {
        id: `${id}-idea`,
        projectId: id,
        type: 'idea',
        title: 'Idea and direction',
        summary: 'Hypotheses, interpretations, and manual research decisions.',
        updatedAt: createdAt,
      },
      {
        id: `${id}-pilot`,
        projectId: id,
        type: 'experiment',
        title: 'Reproduction and pilots',
        summary: 'Pipeline checks, baseline reproduction, and low-cost validation.',
        updatedAt: createdAt,
      },
      {
        id: `${id}-figures`,
        projectId: id,
        type: 'figure',
        title: 'Figures',
        summary: 'Figure plans and source mappings.',
        updatedAt: createdAt,
      },
      {
        id: `${id}-writing`,
        projectId: id,
        type: 'writing',
        title: 'Writing',
        summary: 'Claims tied back to accepted evidence.',
        updatedAt: createdAt,
      },
    ],
    notes: [],
    sources: [],
    hypotheses: [],
    nodes: [],
    runs: [],
    evidences: [],
    decisions: [],
  }
}

export function appendHypothesisRevision(
  project: WorkspaceProjectBundle,
  input: {
    researchQuestion: string
    hypothesis: string
    theory: string
    scope: string
    predictions: string[]
    createdAt?: number
  },
): { project: WorkspaceProjectBundle; hypothesis: UiHypothesisRevision } {
  const createdAt = input.createdAt ?? Date.now()
  const hypothesis: UiHypothesisRevision = {
    id: nextId('hypothesis', project.hypotheses.length),
    projectId: project.id,
    previousRevisionId: project.hypotheses.at(-1)?.id ?? null,
    researchQuestion: input.researchQuestion,
    hypothesis: input.hypothesis,
    theory: input.theory,
    scope: input.scope,
    predictions: input.predictions.filter(Boolean),
    createdAt,
  }

  return {
    project: {
      ...touchProject(project, createdAt),
      hypotheses: [...project.hypotheses, hypothesis],
    },
    hypothesis,
  }
}

export function appendExperimentNode(
  project: WorkspaceProjectBundle,
  input: {
    group: ExperimentGroup
    title: string
    validationQuestion: string
    plan: string
    expectedResult: string
    acceptanceCriteria: string[]
    createdAt?: number
  },
): { project: WorkspaceProjectBundle; node: UiExperimentNode } {
  const createdAt = input.createdAt ?? Date.now()
  const node: UiExperimentNode = {
    id: nextId('node', project.nodes.length),
    projectId: project.id,
    group: input.group,
    hypothesisRevisionId: project.hypotheses.at(-1)?.id ?? null,
    title: input.title,
    validationQuestion: input.validationQuestion,
    plan: input.plan,
    expectedResult: input.expectedResult,
    acceptanceCriteria: input.acceptanceCriteria.filter(Boolean),
    status: 'draft',
    createdAt,
    evidenceIds: [],
  }

  return {
    project: {
      ...touchProject(project, createdAt),
      nodes: [...project.nodes, node],
    },
    node,
  }
}

export function appendEvidenceRecord(
  project: WorkspaceProjectBundle,
  input: {
    nodeId: string
    summary: string
    result: EvidenceResult
    sourceRun: string
    limitations: string
    createdAt?: number
  },
): { project: WorkspaceProjectBundle; evidence: UiEvidenceRecord } {
  const createdAt = input.createdAt ?? Date.now()
  const node = project.nodes.find((item) => item.id === input.nodeId)
  if (!node) {
    throw new Error(`Cannot record evidence for missing node ${input.nodeId}.`)
  }
  if (node.status !== 'approved' && node.status !== 'waiting-evidence' && node.status !== 'accepted' && node.status !== 'rejected') {
    throw new Error(`Node ${input.nodeId} must be approved before recording evidence.`)
  }

  const evidence: UiEvidenceRecord = {
    id: nextId('evidence', project.evidences.length),
    projectId: project.id,
    nodeId: node.id,
    summary: input.summary,
    result: input.result,
    sourceRun: input.sourceRun,
    limitations: input.limitations,
    reviewStatus: 'pending',
    createdAt,
  }

  return {
    project: {
      ...touchProject(project, createdAt),
      nodes: project.nodes.map((item) =>
        item.id === node.id ? { ...item, status: 'waiting-evidence', evidenceIds: [...item.evidenceIds, evidence.id] } : item,
      ),
      evidences: [...project.evidences, evidence],
    },
    evidence,
  }
}

export function approveExperimentNodeDraft(
  project: WorkspaceProjectBundle,
  nodeId: string,
  approvedAt = Date.now(),
): WorkspaceProjectBundle {
  const node = project.nodes.find((item) => item.id === nodeId)
  if (!node) {
    throw new Error(`Cannot approve missing node ${nodeId}.`)
  }
  if (node.status !== 'draft') {
    throw new Error('Only draft nodes can be approved.')
  }

  return {
    ...touchProject(project, approvedAt),
    nodes: project.nodes.map((item) => (item.id === nodeId ? { ...item, status: 'approved' } : item)),
  }
}

export function reviewEvidenceRecord(
  project: WorkspaceProjectBundle,
  evidenceId: string,
  reviewStatus: Exclude<EvidenceReviewStatus, 'pending'>,
  reviewedAt = Date.now(),
): WorkspaceProjectBundle {
  return {
    ...touchProject(project, reviewedAt),
    evidences: project.evidences.map((item) => (item.id === evidenceId ? { ...item, reviewStatus, reviewedAt } : item)),
  }
}

export function selectBranchProposal(
  project: WorkspaceProjectBundle,
  input: {
    nodeId: string
    title: string
    triggerEvidenceIds: string[]
    rationale: string
    expectedCost: string
    uncertainty: string
    selectedBy: string
    selectedAt?: number
  },
): { project: WorkspaceProjectBundle; decision: UiHumanDecision } {
  const selectedAt = input.selectedAt ?? Date.now()
  const decision: UiHumanDecision = {
    id: nextId('decision', project.decisions.length),
    projectId: project.id,
    nodeId: input.nodeId,
    branchTitle: input.title,
    triggerEvidenceIds: [...input.triggerEvidenceIds],
    rationale: input.rationale,
    expectedCost: input.expectedCost,
    uncertainty: input.uncertainty,
    selectedBy: input.selectedBy,
    selectedAt,
  }

  return {
    project: {
      ...touchProject(project, selectedAt),
      decisions: [...project.decisions, decision],
    },
    decision,
  }
}

export function draftFormalPromotion(
  project: WorkspaceProjectBundle,
  input: {
    pilotNodeId: string
    title: string
    plan: string
    acceptanceCriteria: string[]
    createdAt?: number
  },
): { project: WorkspaceProjectBundle; formalNode: UiExperimentNode } {
  const createdAt = input.createdAt ?? Date.now()
  const pilot = project.nodes.find((item) => item.id === input.pilotNodeId)
  if (!pilot) {
    throw new Error(`Cannot promote missing pilot node ${input.pilotNodeId}.`)
  }
  if (pilot.group !== 'pilot') {
    throw new Error(`Only pilot nodes can be promoted.`)
  }

  const formalNode: UiExperimentNode = {
    id: nextId('node', project.nodes.length),
    projectId: project.id,
    group: 'formal',
    hypothesisRevisionId: pilot.hypothesisRevisionId,
    title: input.title,
    validationQuestion: pilot.validationQuestion,
    plan: input.plan,
    expectedResult: pilot.expectedResult,
    acceptanceCriteria: input.acceptanceCriteria.filter(Boolean),
    status: 'draft',
    createdAt,
    sourcePilotNodeId: pilot.id,
    evidenceIds: [],
  }

  return {
    project: {
      ...touchProject(project, createdAt),
      nodes: [...project.nodes, formalNode],
    },
    formalNode,
  }
}

function touchProject(project: WorkspaceProjectBundle, updatedAt: number): WorkspaceProjectBundle {
  return {
    ...project,
    updatedAt,
  }
}

function nextId(prefix: string, currentLength: number): string {
  return `${prefix}-${currentLength + 1}`
}
