import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acceptEvidence,
  approveExperimentNode,
  createProject,
  draftExperimentNode,
  draftHypothesisRevision,
  promotePilotToFormalDraft,
  proposeBranch,
  recordEvidence,
  recordRun,
  selectBranch,
} from './index.ts'

const baseProject = () =>
  createProject({
    id: 'project-1',
    name: 'Evidence loop',
    createdAt: 1,
  })

const baseHypothesis = () => {
  const project = baseProject()
  return draftHypothesisRevision(project, {
    researchQuestion: 'Will pilot evidence support the new sampler?',
    hypothesis: 'A smaller sampler will improve stability for low-data pilots.',
    theory: 'Smaller batches should reduce variance across runs.',
    scope: 'Low-data pilot studies only.',
    predictions: ['Lower variance on repeated pilot runs.'],
    createdAt: 2,
  })
}

const approvedPilotNode = () => {
  const hypothesis = baseHypothesis()
  const drafted = draftExperimentNode(hypothesis.project, {
    hypothesisRevisionId: hypothesis.hypothesisRevision.id,
    kind: 'pilot',
    title: 'Low-data pilot',
    validationQuestion: 'Does the sampler hold up on a tiny dataset?',
    plan: 'Run three seeded pilot executions.',
    expectedResult: 'The pilot remains stable enough to justify a branch decision.',
    acceptanceCriteria: ['Each run is reproducible', 'The evidence is reviewable'],
    createdAt: 3,
  })

  return approveExperimentNode(drafted.project, {
    nodeId: drafted.node.id,
    approvedBy: 'human',
    approvedAt: 4,
    note: 'Pilot is ready to run.',
  })
}

test('rejects run recording before a node is approved', () => {
  const hypothesis = baseHypothesis()
  const drafted = draftExperimentNode(hypothesis.project, {
    hypothesisRevisionId: hypothesis.hypothesisRevision.id,
    kind: 'pilot',
    title: 'Unapproved pilot',
    validationQuestion: 'Can we run early?',
    plan: 'Do not.',
    expectedResult: 'No run should be accepted yet.',
    acceptanceCriteria: ['Approval first'],
    createdAt: 3,
  })

  assert.throws(
    () =>
      recordRun(drafted.project, {
        nodeId: drafted.node.id,
        codeVersion: 'abc123',
        dataVersion: 'pilot-set-1',
        parameters: { batchSize: 2 },
        environment: 'local',
        seed: 7,
        status: 'completed',
        createdAt: 5,
      }),
    (error) => error instanceof Error && (error as { code?: string }).code === 'NODE_NOT_APPROVED',
  )
})

test('rejects branch selection for an unknown proposal', () => {
  const approved = approvedPilotNode()

  assert.throws(
    () =>
      selectBranch(approved.project, {
        nodeId: approved.node.id,
        branchProposalId: 'branch-999',
        selectedBy: 'human',
        rationale: 'Pick the missing branch.',
        selectedAt: 9,
      }),
    (error) => error instanceof Error && (error as { code?: string }).code === 'BRANCH_PROPOSAL_NOT_FOUND',
  )
})

test('accepts negative evidence and preserves the run provenance', () => {
  const approved = approvedPilotNode()
  const runRecord = recordRun(approved.project, {
    nodeId: approved.node.id,
    codeVersion: 'abc123',
    dataVersion: 'pilot-set-1',
    parameters: { batchSize: 2 },
    environment: 'local',
    seed: 7,
    status: 'completed',
    createdAt: 5,
  })

  const evidenceRecord = recordEvidence(runRecord.project, {
    runId: runRecord.run.id,
    summary: 'The sampler drifted under the smallest batch, but the run stayed interpretable.',
    result: 'negative',
    createdAt: 6,
    notes: 'Negative is still valid evidence here.',
  })

  const accepted = acceptEvidence(evidenceRecord.project, {
    evidenceId: evidenceRecord.evidence.id,
    acceptedBy: 'human',
    note: 'A valid negative result still counts as evidence.',
    reviewedAt: 7,
  })

  assert.equal(accepted.evidence.status, 'accepted')
  assert.equal(accepted.evidence.result, 'negative')
  assert.equal(accepted.evidence.runId, runRecord.run.id)
  assert.deepEqual(accepted.evidence.provenance, {
    codeVersion: 'abc123',
    dataVersion: 'pilot-set-1',
    environment: 'local',
    seed: 7,
    runStatus: 'completed',
  })
})

test('selecting a branch does not auto-start a new run', () => {
  const approved = approvedPilotNode()
  const runRecord = recordRun(approved.project, {
    nodeId: approved.node.id,
    codeVersion: 'abc123',
    dataVersion: 'pilot-set-1',
    parameters: { batchSize: 2 },
    environment: 'local',
    seed: 7,
    status: 'completed',
    createdAt: 5,
  })

  const evidenceRecord = recordEvidence(runRecord.project, {
    runId: runRecord.run.id,
    summary: 'The sampler is usable but not yet formal-experiment ready.',
    result: 'negative',
    createdAt: 6,
  })

  const proposed = proposeBranch(evidenceRecord.project, {
    nodeId: approved.node.id,
    title: 'Increase batch size',
    rationale: 'The small batch evidence suggests a wider sweep next.',
    triggerEvidenceIds: [evidenceRecord.evidence.id],
    expectedCost: 'One more pilot cycle.',
    uncertainty: 'It may still fail once the dataset grows.',
    createdAt: 7,
  })

  const selected = selectBranch(proposed.project, {
    nodeId: approved.node.id,
    branchProposalId: proposed.branch.id,
    selectedBy: 'human',
    rationale: 'Run the next pilot branch.',
    selectedAt: 8,
  })

  assert.equal(selected.project.runs.length, 1)
  assert.equal(selected.project.branchProposals.find((branch) => branch.id === proposed.branch.id)?.status, 'selected')
  assert.equal(selected.decision.branchProposalId, proposed.branch.id)
})

test('promoting a pilot draft creates a new formal draft without rewriting the pilot history', () => {
  const approved = approvedPilotNode()
  const runRecord = recordRun(approved.project, {
    nodeId: approved.node.id,
    codeVersion: 'abc123',
    dataVersion: 'pilot-set-1',
    parameters: { batchSize: 2 },
    environment: 'local',
    seed: 7,
    status: 'completed',
    createdAt: 5,
  })

  const evidenceRecord = recordEvidence(runRecord.project, {
    runId: runRecord.run.id,
    summary: 'The pilot is stable enough to promote.',
    result: 'positive',
    createdAt: 6,
  })

  const accepted = acceptEvidence(evidenceRecord.project, {
    evidenceId: evidenceRecord.evidence.id,
    acceptedBy: 'human',
    reviewedAt: 7,
  })

  const promoted = promotePilotToFormalDraft(accepted.project, {
    nodeId: approved.node.id,
    formalTitle: 'Formal follow-up',
    formalPlan: 'Scale up the pilot branch into the formal experiment.',
    formalAcceptanceCriteria: ['Formal controls defined', 'Formal evidence plan frozen'],
    createdAt: 8,
  })

  assert.equal(promoted.formalNode.kind, 'formal')
  assert.equal(promoted.formalNode.sourcePilotNodeId, approved.node.id)
  assert.equal(promoted.formalNode.hypothesisRevisionId, approved.node.hypothesisRevisionId)
  assert.equal(promoted.project.nodes.find((node) => node.id === approved.node.id)?.kind, 'pilot')
  assert.equal(promoted.project.nodes.find((node) => node.id === approved.node.id)?.promotionHistory[0]?.formalNodeId, promoted.formalNode.id)
})
