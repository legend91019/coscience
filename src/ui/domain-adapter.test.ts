import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appendEvidenceRecord,
  appendExperimentNode,
  appendHypothesisRevision,
  approveExperimentNodeDraft,
  createWorkspaceProject,
  draftFormalPromotion,
  selectBranchProposal,
} from './domain-adapter.ts'

test('selecting a branch records a human decision without starting a run', () => {
  const project = createWorkspaceProject('project-1', 'Sampler study', 1)
  const hypothesis = appendHypothesisRevision(project, {
    researchQuestion: 'Does the sampler hold up?',
    hypothesis: 'The sampler improves low-data stability.',
    theory: 'Smaller batches reduce variance.',
    scope: 'Pilot studies only.',
    predictions: ['Lower variance across repeated runs.'],
    createdAt: 2,
  })
  const node = appendExperimentNode(hypothesis.project, {
    group: 'pilot',
    title: 'Low-data pilot',
    validationQuestion: 'Does the sampler remain stable?',
    plan: 'Run three seeded pilots.',
    expectedResult: 'Variance improves enough to inspect a branch.',
    acceptanceCriteria: ['Seeds recorded'],
    createdAt: 3,
  })
  const approved = approveExperimentNodeDraft(node.project, node.node.id, 4)
  const evidence = appendEvidenceRecord(approved, {
    nodeId: node.node.id,
    summary: 'Only one data scale improved.',
    result: 'inconclusive',
    sourceRun: 'manual pilot notes',
    limitations: 'Needs another scale sweep.',
    createdAt: 5,
  })

  const selected = selectBranchProposal(evidence.project, {
    nodeId: node.node.id,
    title: 'Run a wider pilot sweep',
    triggerEvidenceIds: [evidence.evidence.id],
    rationale: 'The current evidence is too narrow for formal claims.',
    expectedCost: 'One pilot session',
    uncertainty: 'May still be data-scale specific.',
    selectedBy: 'human',
    selectedAt: 6,
  })

  assert.equal(selected.project.decisions.length, 1)
  assert.equal(selected.project.runs.length, 0)
  assert.equal(selected.decision.branchTitle, 'Run a wider pilot sweep')
})

test('pilot promotion creates an unapproved formal draft and preserves pilot evidence', () => {
  const project = createWorkspaceProject('project-1', 'Sampler study', 1)
  const hypothesis = appendHypothesisRevision(project, {
    researchQuestion: 'Does the sampler hold up?',
    hypothesis: 'The sampler improves low-data stability.',
    theory: 'Smaller batches reduce variance.',
    scope: 'Pilot studies only.',
    predictions: ['Lower variance across repeated runs.'],
    createdAt: 2,
  })
  const node = appendExperimentNode(hypothesis.project, {
    group: 'pilot',
    title: 'Low-data pilot',
    validationQuestion: 'Does the sampler remain stable?',
    plan: 'Run three seeded pilots.',
    expectedResult: 'Variance improves enough to inspect a branch.',
    acceptanceCriteria: ['Seeds recorded'],
    createdAt: 3,
  })
  const approved = approveExperimentNodeDraft(node.project, node.node.id, 4)
  const evidence = appendEvidenceRecord(approved, {
    nodeId: node.node.id,
    summary: 'The pilot passed reliability checks.',
    result: 'positive',
    sourceRun: 'manual pilot notes',
    limitations: 'Small data only.',
    createdAt: 5,
  })

  const promoted = draftFormalPromotion(evidence.project, {
    pilotNodeId: node.node.id,
    title: 'Formal sampler comparison',
    plan: 'Run the frozen formal comparison.',
    acceptanceCriteria: ['Seeds and controls frozen'],
    createdAt: 6,
  })

  assert.equal(promoted.formalNode.group, 'formal')
  assert.equal(promoted.formalNode.status, 'draft')
  assert.equal(promoted.formalNode.sourcePilotNodeId, node.node.id)
  assert.deepEqual(
    promoted.project.nodes.find((item) => item.id === node.node.id)?.evidenceIds,
    [evidence.evidence.id],
  )
})

test('approving an experiment node marks only a draft node as approved', () => {
  const project = createWorkspaceProject('project-1', 'Sampler study', 1)
  const node = appendExperimentNode(project, {
    group: 'pilot',
    title: 'Low-data pilot',
    validationQuestion: 'Does the sampler remain stable?',
    plan: 'Run three seeded pilots.',
    expectedResult: 'Variance improves enough to inspect a branch.',
    acceptanceCriteria: ['Seeds recorded'],
    createdAt: 2,
  })

  const approved = approveExperimentNodeDraft(node.project, node.node.id, 3)

  assert.equal(approved.nodes.find((item) => item.id === node.node.id)?.status, 'approved')
  assert.throws(() => approveExperimentNodeDraft(approved, node.node.id, 4), /Only draft nodes can be approved/)
})

test('recording evidence requires an approved experiment node', () => {
  const project = createWorkspaceProject('project-1', 'Sampler study', 1)
  const node = appendExperimentNode(project, {
    group: 'pilot',
    title: 'Low-data pilot',
    validationQuestion: 'Does the sampler remain stable?',
    plan: 'Run three seeded pilots.',
    expectedResult: 'Variance improves enough to inspect a branch.',
    acceptanceCriteria: ['Seeds recorded'],
    createdAt: 2,
  })

  assert.throws(
    () =>
      appendEvidenceRecord(node.project, {
        nodeId: node.node.id,
        summary: 'The pilot passed reliability checks.',
        result: 'positive',
        sourceRun: 'manual pilot notes',
        limitations: 'Small data only.',
        createdAt: 3,
      }),
    /must be approved before recording evidence/,
  )
})
