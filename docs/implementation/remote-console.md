# Remote Console Skeleton Implementation Note

This milestone adds a read-only remote experiment console model under `src/remote` without connecting to SSH, GPU polling, or any execution backend.

## Owner Files

- `src/remote/console.ts`
- `src/remote/index.ts`
- `src/remote/console.test.ts`

## Public API

- `createRemoteConsoleSnapshot(input)`
- `deriveCompletionPolicies(snapshot)`
- `summarizeRemoteConsole(snapshot)`
- `RemoteConnectionStatus`
- `RemoteGpuStatus`
- `RemoteRunStatus`
- `RemoteArtifactKind`
- `RemoteCompletionAction`
- `RemoteConsoleSnapshot`

The model is intentionally read-only. It describes what the console should show and how a completion action should be previewed, but it does not connect to a server, change machine state, or launch work.

## What the Snapshot Carries

- Connection state and the latest human-readable status.
- One or more GPU slots with memory usage and workload labels.
- A single experiment run preview with progress, current step, and blockers.
- Disk artifacts with retention and notes.
- Completion policy previews such as save-image-and-stop, archive-artifacts, keep-running, and request-human-review.

## Safety Boundary

`deriveCompletionPolicies` is a preview helper. It classifies each completion action as `safe`, `needs-review`, or `blocked` based on the read-only snapshot. It does not try to execute the action or infer any hidden server state.

`summarizeRemoteConsole` turns the snapshot into compact text for the future UI shell. It reports only what the input already said, plus straightforward counts.

## Fixture Flow

```ts
const snapshot = createRemoteConsoleSnapshot({
  serverName: '4090 lab node',
  connection: {
    status: 'connected',
    label: 'SSH tunnel up',
    details: 'Preview data only',
    lastCheckedAt: 10,
  },
  gpus: [],
  run: {
    id: 'run-1',
    title: 'Pilot run',
    status: 'completed',
    stage: 'Pilot validation',
    progress: 1,
    currentStep: null,
    lastUpdateAt: 11,
    blockers: [],
  },
  artifacts: [],
})
```

## Next Integration Step

When a real backend exists, translate SSH or provider data into `RemoteConsoleSnapshot` first, then render the future console UI from `summarizeRemoteConsole` and `completionPolicies`. Keep command execution, shutdown, and artifact retention in a separate service boundary so the UI stays honest and read-only.
