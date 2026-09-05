import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRemoteConsoleSnapshot,
  deriveCompletionPolicies,
  summarizeRemoteConsole,
} from './console.ts'

const baseSnapshot = () =>
  createRemoteConsoleSnapshot({
    serverName: '4090 lab node',
    connection: {
      status: 'connected',
      label: 'SSH tunnel up',
      details: 'Preview data only',
      lastCheckedAt: 10,
    },
    gpus: [
      {
        id: 'gpu-0',
        name: 'RTX 4090',
        status: 'idle',
        memoryUsedGiB: 1.2,
        memoryTotalGiB: 24,
        activeWorkload: null,
      },
      {
        id: 'gpu-1',
        name: 'RTX 4090',
        status: 'working',
        memoryUsedGiB: 18.4,
        memoryTotalGiB: 24,
        activeWorkload: 'training epoch 18',
      },
    ],
    run: {
      id: 'run-1',
      title: 'Pilot run',
      status: 'running',
      stage: 'Pilot validation',
      progress: 0.42,
      currentStep: 'Evaluating validation split',
      lastUpdateAt: 11,
      blockers: ['Waiting for the next checkpoint'],
    },
    artifacts: [
      {
        id: 'artifact-1',
        path: '/mnt/experiments/run-1',
        kind: 'checkpoint',
        sizeLabel: '3.2 GB',
        updatedAt: 12,
        retention: 'keep for 7 days',
        note: 'Contains the latest checkpoint and logs',
      },
    ],
    notes: ['  review after run finishes  '],
  })

test('creates a read-only remote console snapshot and trims preview text', () => {
  const snapshot = baseSnapshot()

  assert.equal(snapshot.serverName, '4090 lab node')
  assert.equal(snapshot.notes[0], 'review after run finishes')
  assert.equal(snapshot.connection.status, 'connected')
  assert.equal(snapshot.gpus[1].activeWorkload, 'training epoch 18')
  assert.equal(snapshot.completionPolicies.length, 4)
})

test('derives safe shutdown preview only after the run is finished and GPUs are idle', () => {
  const activePolicies = deriveCompletionPolicies(baseSnapshot())
  const stopPolicy = activePolicies.find((policy) => policy.action === 'save-image-and-stop')

  assert.equal(stopPolicy?.safety, 'blocked')
  assert.match(stopPolicy?.prerequisites[0] ?? '', /finished state/)

  const finishedSnapshot = createRemoteConsoleSnapshot({
    serverName: '4090 lab node',
    connection: {
      status: 'connected',
      label: 'SSH tunnel up',
      details: 'Preview data only',
      lastCheckedAt: 20,
    },
    gpus: [
      {
        id: 'gpu-0',
        name: 'RTX 4090',
        status: 'idle',
        memoryUsedGiB: 0.5,
        memoryTotalGiB: 24,
        activeWorkload: null,
      },
    ],
    run: {
      id: 'run-1',
      title: 'Pilot run',
      status: 'completed',
      stage: 'Pilot validation',
      progress: 1,
      currentStep: null,
      lastUpdateAt: 22,
      blockers: [],
    },
    artifacts: [
      {
        id: 'artifact-1',
        path: '/mnt/experiments/run-1',
        kind: 'checkpoint',
        sizeLabel: '3.2 GB',
        updatedAt: 23,
        retention: 'keep for 7 days',
        note: 'Contains the latest checkpoint and logs',
      },
    ],
  })

  const finishedStopPolicy = finishedSnapshot.completionPolicies.find((policy) => policy.action === 'save-image-and-stop')

  assert.equal(finishedStopPolicy?.safety, 'safe')
})

test('summarizes the console without inventing execution state', () => {
  const snapshot = baseSnapshot()
  const summary = summarizeRemoteConsole(snapshot)

  assert.equal(summary.connection, 'SSH tunnel up (connected)')
  assert.equal(summary.gpus, '2/2 online, 1 busy')
  assert.equal(summary.run, 'Pilot run - running')
  assert.equal(summary.artifacts, '1 artifact tracked')
  assert.equal(summary.readiness, 'needs-review')
})
