# Workspace UI Implementation Note

This milestone adds a local React workspace under `src/ui` without depending on a finished desktop backend or agent runtime.

## Owner Files

- `src/ui/App.tsx`
- `src/ui/App.css`
- `src/ui/domain-adapter.ts`
- `src/ui/repository.ts`
- `src/ui/domain-adapter.test.ts`
- `src/ui/repository.test.ts`

No files under `reference_repository` were read as instructions or modified.

## UI Shape

`App` renders the first milestone workbench directly:

- Left rail: local projects, four workspace thread types, and independent pilot/formal experiment groups.
- Center: manual discussion notes scoped to the selected thread.
- Right console: hypothesis revisions, reference/baseline source lists with uncertainty, experiment node drafts, evidence review, manual branch decisions, and pilot-to-formal draft promotion.

Figure and writing workspaces are present as honest manual placeholders. They do not claim automatic plotting or paper generation.

## Adapter Boundary

`domain-adapter.ts` defines UI-owned types for the first milestone:

- `WorkspaceSnapshot`
- `WorkspaceProjectBundle`
- `WorkspaceThread`
- `UiHypothesisRevision`
- `UiExperimentNode`
- `UiEvidenceRecord`
- `UiHumanDecision`

The UI adapter deliberately does not import `src/core`. Integration can later translate between these UI records and the validated core API without making React components depend on core internals.

The adapter keeps the research direction rules explicit:

- Evidence can only be recorded against approved experiment nodes.
- Selecting a branch records a human decision and does not start a run.
- Promoting a pilot creates an unapproved formal draft and leaves pilot evidence in place.
- Runtime states are `not-configured`, `disconnected`, `connected`, or `unknown`; the UI does not invent live server, model, SSH, or GPU activity.

## Persistence

`repository.ts` wraps browser storage behind `WorkspaceRepository`.

- Current storage key: `coscience.workspace.v1`
- Current schema version: `1`
- Empty storage returns an empty workspace snapshot.
- Unsupported schema versions or malformed data throw `InvalidWorkspaceDataError` with `recoverable = true`; the UI can start clean without clearing saved data.

## Validation

The available checks are Node's built-in TypeScript test runner because root package tooling belongs to the integration task.

```powershell
node --test src\core\evidence-domain.test.ts src\ui\repository.test.ts src\ui\domain-adapter.test.ts
```

The UI repository tests cover empty loads, save/load round trips with schema metadata, and recoverable invalid data. The UI adapter tests cover manual branch selection and pilot promotion boundaries.
