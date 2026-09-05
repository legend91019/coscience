# Evidence Domain Implementation Note

This milestone keeps the research evidence loop in pure domain functions under `src/core`.

## Public API

- `createProject(input)`
- `draftHypothesisRevision(project, input)`
- `draftExperimentNode(project, input)`
- `approveExperimentNode(project, input)`
- `recordRun(project, input)`
- `recordEvidence(project, input)`
- `acceptEvidence(project, input)`
- `rejectEvidence(project, input)`
- `proposeBranch(project, input)`
- `selectBranch(project, input)`
- `promotePilotToFormalDraft(project, input)`
- `DomainValidationError`

All operations return a new project snapshot plus the newly created or updated record. They do not mutate the input project.

## Fixture Flow

```ts
const project = createProject({ id: 'project-1', name: 'Evidence loop', createdAt: 1 })
const hypothesis = draftHypothesisRevision(project, {
  researchQuestion: 'Will the pilot support the sampler?',
  hypothesis: 'A smaller sampler improves stability.',
  theory: 'Lower batch variance should help.',
  scope: 'Low-data pilot studies only.',
  predictions: ['Lower variance across repeated runs.'],
  createdAt: 2,
})
const drafted = draftExperimentNode(hypothesis.project, {
  hypothesisRevisionId: hypothesis.hypothesisRevision.id,
  kind: 'pilot',
  title: 'Low-data pilot',
  validationQuestion: 'Does the sampler hold up?',
  plan: 'Run three seeded pilot executions.',
  expectedResult: 'The pilot remains stable enough to justify a branch decision.',
  acceptanceCriteria: ['Each run is reproducible', 'The evidence is reviewable'],
  createdAt: 3,
})
const approved = approveExperimentNode(drafted.project, {
  nodeId: drafted.node.id,
  approvedBy: 'human',
  approvedAt: 4,
})
```

From there, `recordRun` and `recordEvidence` add provenance, `acceptEvidence` or `rejectEvidence` closes review, `proposeBranch` plus `selectBranch` records the human decision, and `promotePilotToFormalDraft` creates a formal follow-up node without rewriting the pilot history.