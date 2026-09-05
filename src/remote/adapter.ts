import {
  createRemoteConsoleSnapshot,
  type RemoteArtifactKind,
  type RemoteConsoleSnapshot,
  type RemoteGpuPreview,
  type RemoteRunPreview,
} from './console.ts'

export type RemoteCommandResult = {
  stdout: string
  stderr?: string
  exitCode?: number | null
  timedOut?: boolean
}

export type RemoteConsoleAdapterInput = {
  serverName?: string
  capturedAt?: number | null
  hostname?: RemoteCommandResult
  gpu?: RemoteCommandResult
  run?: RemoteCommandResult
  artifacts?: RemoteCommandResult
}

type CommandName = 'hostname' | 'gpu' | 'run' | 'artifacts'

type ParseResult<T> = {
  value: T
  issue: boolean
}

const commandNames: CommandName[] = ['hostname', 'gpu', 'run', 'artifacts']
const knownArtifactKinds: RemoteArtifactKind[] = ['checkpoint', 'log', 'metric', 'figure', 'dataset', 'image', 'package', 'other']

/**
 * Converts already-collected SSH command results into the read-only console model.
 * This function has no SSH, filesystem, process, or clock side effects.
 */
export function parseRemoteConsoleSnapshot(input: RemoteConsoleAdapterInput): RemoteConsoleSnapshot {
  const outputs = {
    hostname: input.hostname,
    gpu: input.gpu,
    run: input.run,
    artifacts: input.artifacts,
  }
  const suppliedCommands = commandNames.filter((name) => outputs[name] !== undefined)
  const failedCommands = commandNames.filter((name) => {
    const output = outputs[name]
    return output !== undefined && isCommandFailure(output)
  })
  const missingCommands = commandNames.filter((name) => {
    if (name === 'hostname' && input.serverName?.trim()) {
      return false
    }
    return outputs[name] === undefined
  })
  const notes: string[] = []

  if (missingCommands.length) {
    notes.push(`Missing command output: ${missingCommands.join(', ')}.`)
  }

  const serverName = parseHostname(input.hostname) || input.serverName?.trim() || 'Remote server'
  const gpuResult = parseGpuOutput(input.gpu)
  const runResult = parseRunOutput(input.run)
  const artifactResult = parseArtifactOutput(input.artifacts)

  if (gpuResult.issue) {
    notes.push('Could not parse GPU command output; GPU state is unknown.')
  } else if (!input.gpu) {
    notes.push('GPU state is unknown because no GPU command output was provided.')
  }
  if (runResult.issue) {
    notes.push('Could not parse run command output; run state is unknown.')
  } else if (!input.run) {
    notes.push('Run state is unknown because no run command output was provided.')
  }
  if (artifactResult.issue) {
    notes.push('Could not parse artifact command output; artifact list is incomplete.')
  } else if (!input.artifacts) {
    notes.push('Artifact list is unknown because no artifact command output was provided.')
  }

  const status = suppliedCommands.length === 0
    ? 'not-configured'
    : failedCommands.length
      ? 'disconnected'
      : gpuResult.issue || runResult.issue || artifactResult.issue
        ? 'unknown'
        : missingCommands.length
          ? 'degraded'
          : 'connected'

  if (failedCommands.length) {
    notes.push(`SSH command failed: ${failedCommands.join(', ')}.`)
  }

  const connectionLabel = {
    'not-configured': 'SSH not configured',
    connecting: 'SSH connecting',
    connected: 'SSH data parsed',
    degraded: 'SSH data partial',
    disconnected: 'SSH disconnected',
    unknown: 'SSH state unknown',
  }[status]

  const connectionDetails = status === 'not-configured'
    ? 'No SSH command outputs were provided.'
    : status === 'disconnected'
      ? 'One or more read-only SSH commands failed or timed out.'
      : status === 'unknown'
        ? 'The connection returned data, but one or more outputs were not parseable.'
        : status === 'degraded'
          ? 'The connection returned only a partial set of read-only command outputs.'
          : 'All expected read-only command outputs were parsed.'

  return createRemoteConsoleSnapshot({
    serverName,
    connection: {
      status,
      label: connectionLabel,
      details: connectionDetails,
      lastCheckedAt: finiteNumber(input.capturedAt) ? input.capturedAt! : null,
    },
    gpus: gpuResult.value,
    run: runResult.value,
    artifacts: artifactResult.value,
    notes,
  })
}

function parseHostname(output: RemoteCommandResult | undefined): string | null {
  if (!output || isCommandFailure(output)) {
    return null
  }
  const firstLine = output.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  return firstLine || null
}

function parseGpuOutput(output: RemoteCommandResult | undefined): ParseResult<RemoteGpuPreview[]> {
  if (!output || isCommandFailure(output)) {
    return { value: [unknownGpu()], issue: Boolean(output) }
  }

  const lines = output.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const gpus: RemoteGpuPreview[] = []
  let malformed = false

  for (const line of lines) {
    const fields = line.split(',').map((field) => field.trim())
    if (fields.length < 5 || !/^\d+$/.test(fields[0])) {
      malformed = true
      continue
    }

    const index = fields[0]
    const name = fields.slice(1, -3).join(',').trim() || `GPU ${index}`
    const memoryUsedGiB = parseMemoryGiB(fields.at(-3) ?? '')
    const memoryTotalGiB = parseMemoryGiB(fields.at(-2) ?? '')
    const utilization = parseNumber(fields.at(-1) ?? '')

    if (memoryUsedGiB === null || memoryTotalGiB === null || utilization === null || memoryTotalGiB < 0 || memoryUsedGiB < 0) {
      malformed = true
      continue
    }

    gpus.push({
      id: `gpu-${index}`,
      name,
      status: gpuStatus(memoryUsedGiB, memoryTotalGiB, utilization),
      memoryUsedGiB,
      memoryTotalGiB,
      activeWorkload: utilization > 0 || memoryUsedGiB > 0.5 ? 'GPU workload detected' : null,
    })
  }

  return {
    value: gpus.length ? gpus : [unknownGpu()],
    issue: malformed || gpus.length === 0,
  }
}

function parseRunOutput(output: RemoteCommandResult | undefined): ParseResult<RemoteRunPreview> {
  if (!output || isCommandFailure(output)) {
    return { value: unknownRun(), issue: Boolean(output) }
  }

  const fields = new Map<string, string>()
  for (const line of output.stdout.split(/\r?\n/)) {
    const separator = line.indexOf('=')
    if (separator <= 0) {
      continue
    }
    fields.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim())
  }

  const status = normalizeRunStatus(fields.get('status'))
  const hasKnownField = [...fields.keys()].some((key) => ['id', 'title', 'status', 'stage', 'progress', 'current_step', 'last_update_at', 'blocker'].includes(key))
  if (!hasKnownField) {
    return { value: unknownRun(), issue: true }
  }

  const progress = fields.has('progress') ? parseProgress(fields.get('progress') ?? '') : null
  const lastUpdateAt = fields.has('last_update_at') ? parseTimestamp(fields.get('last_update_at') ?? '') : null
  const issue = status === 'unknown' || (fields.has('progress') && progress === null) || (fields.has('last_update_at') && lastUpdateAt === null)

  return {
    value: {
      id: fields.get('id') || 'run-unknown',
      title: fields.get('title') || 'Unknown run',
      status,
      stage: fields.get('stage') || '',
      progress,
      currentStep: fields.get('current_step') || null,
      lastUpdateAt,
      blockers: [...fields.entries()].filter(([key]) => key === 'blocker').map(([, value]) => value).filter(Boolean),
    },
    issue,
  }
}

function parseArtifactOutput(output: RemoteCommandResult | undefined): ParseResult<RemoteConsoleSnapshot['artifacts']> {
  if (!output || isCommandFailure(output)) {
    return { value: [], issue: Boolean(output) }
  }
  if (!output.stdout.trim()) {
    return { value: [], issue: false }
  }

  const rows = output.stdout.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean)
  const artifacts: RemoteConsoleSnapshot['artifacts'] = []
  let malformed = false

  for (const [index, row] of rows.entries()) {
    const fields = row.split('\t')
    if (index === 0 && fields[0].toLowerCase() === 'id') {
      continue
    }
    if (fields.length < 7 || !fields[0].trim() || !fields[5].trim()) {
      malformed = true
      continue
    }
    artifacts.push({
      id: fields[0].trim(),
      kind: normalizeArtifactKind(fields[1]),
      sizeLabel: fields[2].trim() || 'Size unknown',
      updatedAt: parseTimestamp(fields[3]) ?? null,
      retention: fields[4].trim(),
      path: fields[5].trim(),
      note: fields.slice(6).join('\t').trim(),
    })
  }

  return { value: artifacts, issue: malformed || artifacts.length === 0 }
}

function normalizeRunStatus(value: string | undefined): RemoteRunPreview['status'] {
  const statuses: RemoteRunPreview['status'][] = ['queued', 'running', 'stalled', 'completed', 'failed', 'cancelled']
  return value && statuses.includes(value as RemoteRunPreview['status']) ? value as RemoteRunPreview['status'] : 'unknown'
}

function normalizeArtifactKind(value: string): RemoteArtifactKind {
  const kind = value.trim().toLowerCase() as RemoteArtifactKind
  return knownArtifactKinds.includes(kind) ? kind : 'other'
}

function parseNumber(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:%|[a-z]+)?$/i)
  if (!match) {
    return null
  }
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function parseMemoryGiB(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(gib|gb|mib|mb)?$/i)
  if (!match) {
    return null
  }
  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount < 0) {
    return null
  }
  const unit = match[2]?.toLowerCase()
  return unit === 'gib' || unit === 'gb' ? amount : amount / 1024
}

function parseProgress(value: string): number | null {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return null
  }
  const progress = value.includes('%') ? parsed / 100 : parsed
  return progress >= 0 && progress <= 1 ? progress : null
}

function parseTimestamp(value: string): number | null {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

function finiteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

function gpuStatus(used: number, total: number, utilization: number): RemoteGpuPreview['status'] {
  if (!Number.isFinite(total) || total <= 0 || utilization < 0) {
    return 'unknown'
  }
  if (used / total >= 0.9) {
    return 'memory-pressure'
  }
  return utilization > 0 || used > 0.5 ? 'working' : 'idle'
}

function unknownGpu(): RemoteGpuPreview {
  return {
    id: 'gpu-unknown',
    name: 'Unknown GPU',
    status: 'unknown',
    memoryUsedGiB: 0,
    memoryTotalGiB: 0,
    activeWorkload: null,
  }
}

function unknownRun(): RemoteRunPreview {
  return {
    id: 'run-unknown',
    title: 'Unknown run',
    status: 'unknown',
    stage: '',
    progress: null,
    currentStep: null,
    lastUpdateAt: null,
    blockers: [],
  }
}

function isCommandFailure(output: RemoteCommandResult): boolean {
  return output.timedOut === true
    || (output.exitCode !== undefined && output.exitCode !== null && output.exitCode !== 0)
    || /(?:^|\s)(?:ssh:|connect(?:ion)? (?:to|refused|timed out)|timed out|no route to host|could not resolve|permission denied)/i.test(output.stderr ?? '')
}
