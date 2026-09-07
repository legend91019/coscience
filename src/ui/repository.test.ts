import assert from 'node:assert/strict'
import test from 'node:test'

import {
  exportWorkspaceSnapshot,
  createBrowserWorkspaceRepository,
  createEmptyWorkspaceSnapshot,
  InvalidWorkspaceDataError,
  importWorkspaceSnapshot,
  WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
} from './repository.ts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

test('loads an empty workspace snapshot when storage has no data', () => {
  const repository = createBrowserWorkspaceRepository(new MemoryStorage())

  const loaded = repository.load()

  assert.deepEqual(loaded, createEmptyWorkspaceSnapshot())
})

test('persists and reloads workspace snapshots with the current schema version', () => {
  const storage = new MemoryStorage()
  const repository = createBrowserWorkspaceRepository(storage)
  const snapshot = createEmptyWorkspaceSnapshot()
  const updated = {
    ...snapshot,
    activeProjectId: 'project-1',
    projects: [
      {
        id: 'project-1',
        name: 'Sampler study',
        summary: 'Low-data sampler evidence loop.',
        updatedAt: 42,
      },
    ],
  }

  repository.save(updated)
  const loaded = repository.load()

  assert.equal(JSON.parse(storage.getItem(WORKSPACE_STORAGE_KEY) ?? '{}').schemaVersion, WORKSPACE_SCHEMA_VERSION)
  assert.deepEqual(loaded, updated)
})

test('exports and imports workspace snapshots through a versioned envelope', () => {
  const snapshot = createEmptyWorkspaceSnapshot()
  const exported = exportWorkspaceSnapshot(snapshot)

  assert.deepEqual(importWorkspaceSnapshot(exported), snapshot)
  assert.equal(JSON.parse(exported).schemaVersion, WORKSPACE_SCHEMA_VERSION)
})

test('migrates legacy v1 workspace data from storage', () => {
  const storage = new MemoryStorage()
  storage.setItem('coscience.workspace.v1', JSON.stringify({
    schemaVersion: 1,
    payload: {
      ...createEmptyWorkspaceSnapshot(),
      activeProjectId: 'project-1',
    },
  }))

  const repository = createBrowserWorkspaceRepository(storage)
  const loaded = repository.load()

  assert.equal(loaded.activeProjectId, 'project-1')
})

test('reports recoverable invalid workspace data without clearing storage', () => {
  const storage = new MemoryStorage()
  storage.setItem(WORKSPACE_STORAGE_KEY, '{"schemaVersion":999,"payload":{"projects":[]}}')
  const repository = createBrowserWorkspaceRepository(storage)

  assert.throws(
    () => repository.load(),
    (error) => error instanceof InvalidWorkspaceDataError && error.recoverable === true,
  )
  assert.equal(storage.getItem(WORKSPACE_STORAGE_KEY), '{"schemaVersion":999,"payload":{"projects":[]}}')
})
