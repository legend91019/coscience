export type RemoteConnectionStatus = 'not-configured' | 'connecting' | 'connected' | 'degraded' | 'disconnected' | 'unknown'
export type RemoteGpuStatus = 'idle' | 'working' | 'memory-pressure' | 'offline' | 'unknown'
export type RemoteRunStatus = 'queued' | 'running' | 'stalled' | 'completed' | 'failed' | 'cancelled' | 'unknown'
export type RemoteArtifactKind = 'checkpoint' | 'log' | 'metric' | 'figure' | 'dataset' | 'image' | 'package' | 'other'
export type RemoteCompletionAction = 'save-image-and-stop' | 'archive-artifacts' | 'keep-running' | 'request-human-review'
export type RemotePolicySafety = 'safe' | 'needs-review' | 'blocked'

export type RemoteConnectionPreview = {
  status: RemoteConnectionStatus
  label: string
  details: string
  lastCheckedAt: number | null
}

export type RemoteGpuPreview = {
  id: string
  name: string
  status: RemoteGpuStatus
  memoryUsedGiB: number
  memoryTotalGiB: number
  activeWorkload: string | null
}

export type RemoteRunPreview = {
  id: string
  title: string
  status: RemoteRunStatus
  stage: string
  progress: number | null
  currentStep: string | null
  lastUpdateAt: number | null
  blockers: string[]
}

export type RemoteArtifactPreview = {
  id: string
  path: string
  kind: RemoteArtifactKind
  sizeLabel: string
  updatedAt: number | null
  retention: string
  note: string
}

export type RemoteCompletionPolicyPreview = {
  action: RemoteCompletionAction
  title: string
  summary: string
  safety: RemotePolicySafety
  prerequisites: string[]
  risks: string[]
}

export type RemoteConsoleSnapshot = {
  serverName: string
  connection: RemoteConnectionPreview
  gpus: RemoteGpuPreview[]
  run: RemoteRunPreview
  artifacts: RemoteArtifactPreview[]
  completionPolicies: RemoteCompletionPolicyPreview[]
  notes: string[]
}

export type RemoteConsoleInput = {
  serverName: string
  connection: RemoteConnectionPreview
  gpus: RemoteGpuPreview[]
  run: RemoteRunPreview
  artifacts: RemoteArtifactPreview[]
  notes?: string[]
}

export type RemoteConsoleSummary = {
  connection: string
  gpus: string
  run: string
  artifacts: string
  readiness: 'ready' | 'needs-review' | 'blocked'
}

export function createRemoteConsoleSnapshot(input: RemoteConsoleInput): RemoteConsoleSnapshot {
  const connection = normalizeConnection(input.connection)
  const gpus = input.gpus.map(normalizeGpu)
  const run = normalizeRun(input.run)
  const artifacts = input.artifacts.map(normalizeArtifact)
  const notes = normalizeNotes(input.notes)

  return {
    serverName: input.serverName.trim(),
    connection,
    gpus,
    run,
    artifacts,
    completionPolicies: deriveCompletionPolicies({ connection, gpus, run, artifacts }),
    notes,
  }
}

export function deriveCompletionPolicies(
  snapshot: Pick<RemoteConsoleSnapshot, 'connection' | 'gpus' | 'run' | 'artifacts'>,
): RemoteCompletionPolicyPreview[] {
  const runFinished = snapshot.run.status === 'completed' || snapshot.run.status === 'failed' || snapshot.run.status === 'cancelled'
  const runActive = snapshot.run.status === 'queued' || snapshot.run.status === 'running' || snapshot.run.status === 'stalled'
  const anyGpuBusy = snapshot.gpus.some((gpu) => gpu.status === 'working' || gpu.status === 'memory-pressure')
  const anyGpuOnline = snapshot.gpus.some((gpu) => gpu.status !== 'offline')
  const hasArtifacts = snapshot.artifacts.length > 0
  const connectionStable = snapshot.connection.status === 'connected' || snapshot.connection.status === 'degraded'

  return [
    {
      action: 'save-image-and-stop',
      title: 'Save image and stop',
      summary: 'Preview the safe shutdown path that preserves the current filesystem state before power-off.',
      safety: runFinished && !anyGpuBusy && anyGpuOnline && connectionStable ? 'safe' : 'blocked',
      prerequisites: runFinished
        ? anyGpuBusy
          ? ['Wait until every visible GPU is idle or drained.']
          : ['Confirm the output image has been captured.']
        : ['Wait until the experiment reaches a finished state.'],
      risks: ['Stopping too early can discard a partially written checkpoint or log tail.'],
    },
    {
      action: 'archive-artifacts',
      title: 'Archive artifacts',
      summary: 'Preview the retention step that freezes logs, metrics, and generated outputs for later review.',
      safety: runFinished && hasArtifacts && connectionStable ? 'safe' : runActive ? 'blocked' : 'needs-review',
      prerequisites: hasArtifacts
        ? ['Confirm artifact paths are stable and complete.']
        : ['Record the artifact location before archiving.'],
      risks: ['Archiving before the run finishes can capture an incomplete result set.'],
    },
    {
      action: 'keep-running',
      title: 'Keep running',
      summary: 'Preview the no-op path that leaves the server online for more collection or debugging.',
      safety: runActive && connectionStable ? 'safe' : 'needs-review',
      prerequisites: runActive ? ['A run is still active.'] : ['There is no active run to keep alive.'],
      risks: ['Keeping the machine alive can extend rental cost after the useful work is done.'],
    },
    {
      action: 'request-human-review',
      title: 'Request human review',
      summary: 'Preview the manual checkpoint used when the console cannot safely infer the next step.',
      safety: 'safe',
      prerequisites: ['Use this when the evidence is incomplete or the connection is uncertain.'],
      risks: ['This does not change the server state; it only records that a person should decide.'],
    },
  ]
}

export function summarizeRemoteConsole(snapshot: Pick<RemoteConsoleSnapshot, 'connection' | 'gpus' | 'run' | 'artifacts'>): RemoteConsoleSummary {
  const connectedGpus = snapshot.gpus.filter((gpu) => gpu.status !== 'offline').length
  const busyGpus = snapshot.gpus.filter((gpu) => gpu.status === 'working' || gpu.status === 'memory-pressure').length
  const readiness = snapshot.connection.status === 'connected' && snapshot.run.status === 'completed' && snapshot.artifacts.length > 0
    ? 'ready'
    : snapshot.connection.status === 'disconnected' || snapshot.connection.status === 'not-configured'
      ? 'blocked'
      : 'needs-review'

  return {
    connection: `${snapshot.connection.label} (${snapshot.connection.status})`,
    gpus: `${connectedGpus}/${snapshot.gpus.length} online, ${busyGpus} busy`,
    run: `${snapshot.run.title} - ${snapshot.run.status}`,
    artifacts: `${snapshot.artifacts.length} artifact${snapshot.artifacts.length === 1 ? '' : 's'} tracked`,
    readiness,
  }
}

function normalizeConnection(connection: RemoteConnectionPreview): RemoteConnectionPreview {
  return {
    status: connection.status,
    label: connection.label.trim(),
    details: connection.details.trim(),
    lastCheckedAt: connection.lastCheckedAt ?? null,
  }
}

function normalizeGpu(gpu: RemoteGpuPreview): RemoteGpuPreview {
  return {
    id: gpu.id.trim(),
    name: gpu.name.trim(),
    status: gpu.status,
    memoryUsedGiB: gpu.memoryUsedGiB,
    memoryTotalGiB: gpu.memoryTotalGiB,
    activeWorkload: gpu.activeWorkload?.trim() || null,
  }
}

function normalizeRun(run: RemoteRunPreview): RemoteRunPreview {
  return {
    id: run.id.trim(),
    title: run.title.trim(),
    status: run.status,
    stage: run.stage.trim(),
    progress: run.progress,
    currentStep: run.currentStep?.trim() || null,
    lastUpdateAt: run.lastUpdateAt ?? null,
    blockers: normalizeNotes(run.blockers),
  }
}

function normalizeArtifact(artifact: RemoteArtifactPreview): RemoteArtifactPreview {
  return {
    id: artifact.id.trim(),
    path: artifact.path.trim(),
    kind: artifact.kind,
    sizeLabel: artifact.sizeLabel.trim(),
    updatedAt: artifact.updatedAt ?? null,
    retention: artifact.retention.trim(),
    note: artifact.note.trim(),
  }
}

function normalizeNotes(notes: string[] | undefined): string[] {
  return (notes ?? []).map((note) => note.trim()).filter(Boolean)
}
