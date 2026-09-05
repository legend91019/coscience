export class DomainValidationError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'DomainValidationError'
    this.code = code
  }
}

export type ProjectCounters = {
  hypothesis: number
  node: number
  run: number
  evidence: number
  branch: number
  decision: number
}

export type ProjectState = {
  id: string
  name: string
  createdAt: number
  counters: ProjectCounters
  hypothesisRevisions: HypothesisRevision[]
  nodes: ExperimentNode[]
  runs: ExperimentRun[]
  evidences: EvidenceRecord[]
  branchProposals: BranchProposal[]
  decisions: HumanDecision[]
}

export type HypothesisRevision = {
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

export type ExperimentNodeKind = 'pilot' | 'formal'
export type ExperimentNodeStatus = 'draft' | 'approved'

export type ApprovalRecord = {
  approvedBy: string
  approvedAt: number
  note?: string
}

export type PromotionRecord = {
  formalNodeId: string
  createdAt: number
  note?: string
}

export type BranchSelection = {
  decisionId: string
  branchProposalId: string
  selectedBy: string
  selectedAt: number
  rationale: string
}

export type ExperimentNode = {
  id: string
  projectId: string
  kind: ExperimentNodeKind
  hypothesisRevisionId: string
  title: string
  validationQuestion: string
  plan: string
  expectedResult: string
  acceptanceCriteria: string[]
  status: ExperimentNodeStatus
  createdAt: number
  approvedAt?: number
  approvedBy?: string
  approvalHistory: ApprovalRecord[]
  runs: string[]
  evidenceIds: string[]
  branchProposalIds: string[]
  selectionHistory: BranchSelection[]
  promotionHistory: PromotionRecord[]
  sourcePilotNodeId?: string
}

export type ExperimentRunStatus = 'completed' | 'failed' | 'disconnected'

export type ExperimentRun = {
  id: string
  projectId: string
  nodeId: string
  codeVersion: string
  dataVersion: string
  parameters: Record<string, unknown>
  environment: string
  seed: number
  status: ExperimentRunStatus
  createdAt: number
  evidenceIds: string[]
}

export type EvidenceResult = 'positive' | 'negative' | 'inconclusive'
export type EvidenceStatus = 'pending' | 'accepted' | 'rejected'

export type EvidenceProvenance = {
  codeVersion: string
  dataVersion: string
  environment: string
  seed: number
  runStatus: ExperimentRunStatus
}

export type EvidenceRecord = {
  id: string
  projectId: string
  nodeId: string
  runId: string
  summary: string
  result: EvidenceResult
  status: EvidenceStatus
  createdAt: number
  reviewedAt?: number
  acceptedBy?: string
  rejectedBy?: string
  note?: string
  provenance: EvidenceProvenance
}

export type BranchProposalStatus = 'proposed' | 'selected' | 'dismissed'

export type BranchProposal = {
  id: string
  projectId: string
  nodeId: string
  title: string
  rationale: string
  triggerEvidenceIds: string[]
  expectedCost: string
  uncertainty: string
  status: BranchProposalStatus
  createdAt: number
  selectedAt?: number
  selectedBy?: string
  selectedBranchId?: string
}

export type HumanDecision = {
  id: string
  projectId: string
  nodeId: string
  branchProposalId: string
  selectedBy: string
  rationale: string
  selectedAt: number
}

export function createProject(input: {
  id?: string
  name: string
  createdAt?: number
}): ProjectState {
  return {
    id: input.id ?? 'project-1',
    name: input.name,
    createdAt: input.createdAt ?? 0,
    counters: {
      hypothesis: 0,
      node: 0,
      run: 0,
      evidence: 0,
      branch: 0,
      decision: 0,
    },
    hypothesisRevisions: [],
    nodes: [],
    runs: [],
    evidences: [],
    branchProposals: [],
    decisions: [],
  }
}

export function draftHypothesisRevision(
  project: ProjectState,
  input: {
    researchQuestion: string
    hypothesis: string
    theory: string
    scope: string
    predictions: string[]
    createdAt?: number
  },
): { project: ProjectState; hypothesisRevision: HypothesisRevision } {
  const hypothesisRevision: HypothesisRevision = {
    id: nextId(project, 'hypothesis'),
    projectId: project.id,
    previousRevisionId: project.hypothesisRevisions.at(-1)?.id ?? null,
    researchQuestion: input.researchQuestion,
    hypothesis: input.hypothesis,
    theory: input.theory,
    scope: input.scope,
    predictions: [...input.predictions],
    createdAt: input.createdAt ?? 0,
  }

  return {
    project: {
      ...project,
      counters: bumpCounter(project.counters, 'hypothesis'),
      hypothesisRevisions: [...project.hypothesisRevisions, hypothesisRevision],
    },
    hypothesisRevision,
  }
}

export function draftExperimentNode(
  project: ProjectState,
  input: {
    hypothesisRevisionId: string
    kind?: ExperimentNodeKind
    title: string
    validationQuestion: string
    plan: string
    expectedResult: string
    acceptanceCriteria: string[]
    createdAt?: number
  },
): { project: ProjectState; node: ExperimentNode } {
  ensureHypothesisRevision(project, input.hypothesisRevisionId)

  const node: ExperimentNode = {
    id: nextId(project, 'node'),
    projectId: project.id,
    kind: input.kind ?? 'pilot',
    hypothesisRevisionId: input.hypothesisRevisionId,
    title: input.title,
    validationQuestion: input.validationQuestion,
    plan: input.plan,
    expectedResult: input.expectedResult,
    acceptanceCriteria: [...input.acceptanceCriteria],
    status: 'draft',
    createdAt: input.createdAt ?? 0,
    approvalHistory: [],
    runs: [],
    evidenceIds: [],
    branchProposalIds: [],
    selectionHistory: [],
    promotionHistory: [],
  }

  return {
    project: {
      ...project,
      counters: bumpCounter(project.counters, 'node'),
      nodes: [...project.nodes, node],
    },
    node,
  }
}

export function approveExperimentNode(
  project: ProjectState,
  input: {
    nodeId: string
    approvedBy: string
    approvedAt?: number
    note?: string
  },
): { project: ProjectState; node: ExperimentNode } {
  const { node, index } = ensureNode(project, input.nodeId)

  if (node.status !== 'draft') {
    throw new DomainValidationError('NODE_NOT_DRAFT', `Node ${node.id} is already approved.`)
  }

  const approval: ApprovalRecord = {
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt ?? 0,
    note: input.note,
  }

  const updatedNode: ExperimentNode = {
    ...node,
    status: 'approved',
    approvedAt: approval.approvedAt,
    approvedBy: approval.approvedBy,
    approvalHistory: [...node.approvalHistory, approval],
  }

  return {
    project: replaceNode(project, index, updatedNode),
    node: updatedNode,
  }
}

export function recordRun(
  project: ProjectState,
  input: {
    nodeId: string
    codeVersion: string
    dataVersion: string
    parameters: Record<string, unknown>
    environment: string
    seed: number
    status: ExperimentRunStatus
    createdAt?: number
  },
): { project: ProjectState; run: ExperimentRun } {
  const { node, index } = ensureNode(project, input.nodeId)

  if (node.status !== 'approved') {
    throw new DomainValidationError('NODE_NOT_APPROVED', `Node ${node.id} must be approved before recording a run.`)
  }

  const run: ExperimentRun = {
    id: nextId(project, 'run'),
    projectId: project.id,
    nodeId: node.id,
    codeVersion: input.codeVersion,
    dataVersion: input.dataVersion,
    parameters: { ...input.parameters },
    environment: input.environment,
    seed: input.seed,
    status: input.status,
    createdAt: input.createdAt ?? 0,
    evidenceIds: [],
  }

  const updatedNode: ExperimentNode = {
    ...node,
    runs: [...node.runs, run.id],
  }

  return {
    project: {
      ...replaceNode(project, index, updatedNode),
      counters: bumpCounter(project.counters, 'run'),
      runs: [...project.runs, run],
    },
    run,
  }
}

export function recordEvidence(
  project: ProjectState,
  input: {
    runId: string
    summary: string
    result: EvidenceResult
    createdAt?: number
    notes?: string
  },
): { project: ProjectState; evidence: EvidenceRecord } {
  const { run, index: runIndex } = ensureRun(project, input.runId)
  const { node, index: nodeIndex } = ensureNode(project, run.nodeId)

  const evidence: EvidenceRecord = {
    id: nextId(project, 'evidence'),
    projectId: project.id,
    nodeId: node.id,
    runId: run.id,
    summary: input.summary,
    result: input.result,
    status: 'pending',
    createdAt: input.createdAt ?? 0,
    note: input.notes,
    provenance: {
      codeVersion: run.codeVersion,
      dataVersion: run.dataVersion,
      environment: run.environment,
      seed: run.seed,
      runStatus: run.status,
    },
  }

  const updatedRun: ExperimentRun = {
    ...run,
    evidenceIds: [...run.evidenceIds, evidence.id],
  }

  const updatedNode: ExperimentNode = {
    ...node,
    evidenceIds: [...node.evidenceIds, evidence.id],
  }

  return {
    project: {
      ...replaceNode(replaceRun(project, runIndex, updatedRun), nodeIndex, updatedNode),
      counters: bumpCounter(project.counters, 'evidence'),
      evidences: [...project.evidences, evidence],
    },
    evidence,
  }
}

export function acceptEvidence(
  project: ProjectState,
  input: {
    evidenceId: string
    acceptedBy: string
    note?: string
    reviewedAt?: number
  },
): { project: ProjectState; evidence: EvidenceRecord } {
  return reviewEvidence(project, input.evidenceId, {
    status: 'accepted',
    reviewedAt: input.reviewedAt ?? 0,
    acceptedBy: input.acceptedBy,
    note: input.note,
  })
}

export function rejectEvidence(
  project: ProjectState,
  input: {
    evidenceId: string
    rejectedBy: string
    note?: string
    reviewedAt?: number
  },
): { project: ProjectState; evidence: EvidenceRecord } {
  return reviewEvidence(project, input.evidenceId, {
    status: 'rejected',
    reviewedAt: input.reviewedAt ?? 0,
    rejectedBy: input.rejectedBy,
    note: input.note,
  })
}

export function proposeBranch(
  project: ProjectState,
  input: {
    nodeId: string
    title: string
    rationale: string
    triggerEvidenceIds: string[]
    expectedCost: string
    uncertainty: string
    createdAt?: number
  },
): { project: ProjectState; branch: BranchProposal } {
  const { node, index } = ensureNode(project, input.nodeId)

  if (input.triggerEvidenceIds.length === 0) {
    throw new DomainValidationError('BRANCH_REQUIRES_EVIDENCE', 'A branch proposal needs at least one trigger evidence item.')
  }

  for (const evidenceId of input.triggerEvidenceIds) {
    const evidence = project.evidences.find((item) => item.id === evidenceId)
    if (!evidence) {
      throw new DomainValidationError('EVIDENCE_NOT_FOUND', `Evidence ${evidenceId} does not exist.`)
    }
    if (evidence.nodeId !== node.id) {
      throw new DomainValidationError('EVIDENCE_NODE_MISMATCH', `Evidence ${evidenceId} does not belong to node ${node.id}.`)
    }
  }

  const branch: BranchProposal = {
    id: nextId(project, 'branch'),
    projectId: project.id,
    nodeId: node.id,
    title: input.title,
    rationale: input.rationale,
    triggerEvidenceIds: [...input.triggerEvidenceIds],
    expectedCost: input.expectedCost,
    uncertainty: input.uncertainty,
    status: 'proposed',
    createdAt: input.createdAt ?? 0,
  }

  const updatedNode: ExperimentNode = {
    ...node,
    branchProposalIds: [...node.branchProposalIds, branch.id],
  }

  return {
    project: {
      ...replaceNode(project, index, updatedNode),
      counters: bumpCounter(project.counters, 'branch'),
      branchProposals: [...project.branchProposals, branch],
    },
    branch,
  }
}

export function selectBranch(
  project: ProjectState,
  input: {
    nodeId: string
    branchProposalId: string
    selectedBy: string
    rationale: string
    selectedAt?: number
  },
): { project: ProjectState; decision: HumanDecision } {
  const { node, index } = ensureNode(project, input.nodeId)
  const branchIndex = project.branchProposals.findIndex((proposal) => proposal.id === input.branchProposalId)
  if (branchIndex === -1) {
    throw new DomainValidationError('BRANCH_PROPOSAL_NOT_FOUND', `Branch proposal ${input.branchProposalId} does not exist.`)
  }

  const branch = project.branchProposals[branchIndex]
  if (branch.nodeId !== node.id) {
    throw new DomainValidationError('BRANCH_NODE_MISMATCH', `Branch proposal ${branch.id} does not belong to node ${node.id}.`)
  }

  const decision: HumanDecision = {
    id: nextId(project, 'decision'),
    projectId: project.id,
    nodeId: node.id,
    branchProposalId: branch.id,
    selectedBy: input.selectedBy,
    rationale: input.rationale,
    selectedAt: input.selectedAt ?? 0,
  }

  const updatedNode: ExperimentNode = {
    ...node,
    selectionHistory: [...node.selectionHistory, {
      decisionId: decision.id,
      branchProposalId: branch.id,
      selectedBy: input.selectedBy,
      selectedAt: decision.selectedAt,
      rationale: input.rationale,
    }],
  }

  const updatedBranch: BranchProposal = {
    ...branch,
    status: 'selected',
    selectedAt: decision.selectedAt,
    selectedBy: input.selectedBy,
    selectedBranchId: decision.id,
  }

  return {
    project: {
      ...replaceNode(replaceBranch(project, branchIndex, updatedBranch), index, updatedNode),
      counters: bumpCounter(project.counters, 'decision'),
      decisions: [...project.decisions, decision],
    },
    decision,
  }
}

export function promotePilotToFormalDraft(
  project: ProjectState,
  input: {
    nodeId: string
    formalTitle: string
    formalPlan: string
    formalAcceptanceCriteria: string[]
    createdAt?: number
    note?: string
  },
): { project: ProjectState; formalNode: ExperimentNode } {
  const { node, index } = ensureNode(project, input.nodeId)

  if (node.kind !== 'pilot') {
    throw new DomainValidationError('PILOT_NODE_REQUIRED', `Only pilot nodes can be promoted; node ${node.id} is ${node.kind}.`)
  }

  if (node.status !== 'approved') {
    throw new DomainValidationError('NODE_NOT_APPROVED', `Pilot node ${node.id} must be approved before promotion.`)
  }

  if (node.evidenceIds.length === 0) {
    throw new DomainValidationError('PROMOTION_REQUIRES_EVIDENCE', `Pilot node ${node.id} needs evidence before promotion.`)
  }

  const formalNode: ExperimentNode = {
    id: nextId(project, 'node'),
    projectId: project.id,
    kind: 'formal',
    hypothesisRevisionId: node.hypothesisRevisionId,
    title: input.formalTitle,
    validationQuestion: node.validationQuestion,
    plan: input.formalPlan,
    expectedResult: node.expectedResult,
    acceptanceCriteria: [...input.formalAcceptanceCriteria],
    status: 'draft',
    createdAt: input.createdAt ?? 0,
    approvalHistory: [],
    runs: [],
    evidenceIds: [],
    branchProposalIds: [],
    selectionHistory: [],
    promotionHistory: [],
    sourcePilotNodeId: node.id,
  }

  const updatedPilot: ExperimentNode = {
    ...node,
    promotionHistory: [...node.promotionHistory, {
      formalNodeId: formalNode.id,
      createdAt: input.createdAt ?? 0,
      note: input.note,
    }],
  }

  const updatedProject = replaceNode(project, index, updatedPilot)

  return {
    project: {
      ...updatedProject,
      counters: bumpCounter(project.counters, 'node'),
      nodes: [...updatedProject.nodes, formalNode],
    },
    formalNode,
  }
}

function reviewEvidence(
  project: ProjectState,
  evidenceId: string,
  change: {
    status: EvidenceStatus
    reviewedAt: number
    acceptedBy?: string
    rejectedBy?: string
    note?: string
  },
): { project: ProjectState; evidence: EvidenceRecord } {
  const { evidence, index } = ensureEvidence(project, evidenceId)

  if (evidence.status !== 'pending') {
    throw new DomainValidationError('EVIDENCE_ALREADY_REVIEWED', `Evidence ${evidence.id} has already been reviewed.`)
  }

  const reviewed: EvidenceRecord = {
    ...evidence,
    status: change.status,
    reviewedAt: change.reviewedAt,
    acceptedBy: change.acceptedBy,
    rejectedBy: change.rejectedBy,
    note: change.note,
  }

  return {
    project: {
      ...replaceEvidence(project, index, reviewed),
    },
    evidence: reviewed,
  }
}

function nextId(project: ProjectState, key: keyof ProjectCounters): string {
  return `${key}-${project.counters[key] + 1}`
}

function bumpCounter(counters: ProjectCounters, key: keyof ProjectCounters): ProjectCounters {
  return {
    ...counters,
    [key]: counters[key] + 1,
  }
}

function ensureHypothesisRevision(project: ProjectState, hypothesisRevisionId: string): HypothesisRevision {
  const revision = project.hypothesisRevisions.find((item) => item.id === hypothesisRevisionId)
  if (!revision) {
    throw new DomainValidationError('HYPOTHESIS_NOT_FOUND', `Hypothesis revision ${hypothesisRevisionId} does not exist.`)
  }
  return revision
}

function ensureNode(project: ProjectState, nodeId: string): { node: ExperimentNode; index: number } {
  const index = project.nodes.findIndex((item) => item.id === nodeId)
  if (index === -1) {
    throw new DomainValidationError('NODE_NOT_FOUND', `Node ${nodeId} does not exist.`)
  }
  return { node: project.nodes[index], index }
}

function ensureRun(project: ProjectState, runId: string): { run: ExperimentRun; index: number } {
  const index = project.runs.findIndex((item) => item.id === runId)
  if (index === -1) {
    throw new DomainValidationError('RUN_NOT_FOUND', `Run ${runId} does not exist.`)
  }
  return { run: project.runs[index], index }
}

function ensureEvidence(project: ProjectState, evidenceId: string): { evidence: EvidenceRecord; index: number } {
  const index = project.evidences.findIndex((item) => item.id === evidenceId)
  if (index === -1) {
    throw new DomainValidationError('EVIDENCE_NOT_FOUND', `Evidence ${evidenceId} does not exist.`)
  }
  return { evidence: project.evidences[index], index }
}

function replaceNode(project: ProjectState, index: number, node: ExperimentNode): ProjectState {
  const nodes = [...project.nodes]
  nodes[index] = node
  return {
    ...project,
    nodes,
  }
}

function replaceRun(project: ProjectState, index: number, run: ExperimentRun): ProjectState {
  const runs = [...project.runs]
  runs[index] = run
  return {
    ...project,
    runs,
  }
}

function replaceEvidence(project: ProjectState, index: number, evidence: EvidenceRecord): ProjectState {
  const evidences = [...project.evidences]
  evidences[index] = evidence
  return {
    ...project,
    evidences,
  }
}

function replaceBranch(project: ProjectState, index: number, branch: BranchProposal): ProjectState {
  const branchProposals = [...project.branchProposals]
  branchProposals[index] = branch
  return {
    ...project,
    branchProposals,
  }
}
