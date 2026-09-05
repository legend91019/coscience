import type { WorkspaceSnapshot } from './domain-adapter.ts'

export const WORKSPACE_SCHEMA_VERSION = 1
export const WORKSPACE_STORAGE_KEY = 'coscience.workspace.v1'

export class InvalidWorkspaceDataError extends Error {
  recoverable = true

  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkspaceDataError'
  }
}

export type WorkspaceRepository = {
  load(): WorkspaceSnapshot
  save(snapshot: WorkspaceSnapshot): void
}

export function createEmptyWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    activeProjectId: null,
    activeThreadId: null,
    runtime: {
      model: 'not-configured',
      server: 'not-configured',
      message: 'Connectors are not configured in this milestone.',
    },
    projects: [],
    threads: [],
    notes: [],
    sources: [],
    hypotheses: [],
    nodes: [],
    runs: [],
    evidences: [],
    decisions: [],
  }
}

export function createBrowserWorkspaceRepository(storage: Storage): WorkspaceRepository {
  return {
    load() {
      const raw = storage.getItem(WORKSPACE_STORAGE_KEY)
      if (raw === null) {
        return createEmptyWorkspaceSnapshot()
      }

      let decoded: unknown
      try {
        decoded = JSON.parse(raw)
      } catch (error) {
        throw new InvalidWorkspaceDataError('Saved workspace data is not valid JSON.')
      }

      if (!isRecord(decoded) || decoded.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
        throw new InvalidWorkspaceDataError('Saved workspace data uses an unsupported schema version.')
      }

      const payload = decoded.payload
      if (!isWorkspaceSnapshot(payload)) {
        throw new InvalidWorkspaceDataError('Saved workspace data is missing required workspace fields.')
      }

      return payload
    },
    save(snapshot) {
      storage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: WORKSPACE_SCHEMA_VERSION,
          payload: snapshot,
        }),
      )
    },
  }
}

function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!isRecord(value)) {
    return false
  }

  return (
    hasArray(value, 'projects') &&
    hasArray(value, 'threads') &&
    hasArray(value, 'notes') &&
    hasArray(value, 'sources') &&
    hasArray(value, 'hypotheses') &&
    hasArray(value, 'nodes') &&
    hasArray(value, 'runs') &&
    hasArray(value, 'evidences') &&
    hasArray(value, 'decisions') &&
    'runtime' in value &&
    'activeProjectId' in value &&
    'activeThreadId' in value
  )
}

function hasArray(value: Record<string, unknown>, key: string): boolean {
  return Array.isArray(value[key])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
