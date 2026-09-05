import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseRemoteConsoleSnapshot,
  type RemoteCommandResult,
} from './adapter.ts'

const success = (stdout: string): RemoteCommandResult => ({ stdout, exitCode: 0 })

test('parses successful read-only command output into a connected snapshot', () => {
  const snapshot = parseRemoteConsoleSnapshot({
    serverName: 'configured node',
    capturedAt: 1_700_000_000_000,
    hostname: success('research-node\n'),
    gpu: success([
      '0, NVIDIA GeForce RTX 4090, 12288, 24576, 50',
      '1, NVIDIA GeForce RTX 4090, 0, 24576, 0',
    ].join('\n')),
    run: success([
      'id=run-1',
      'title=Pilot run',
      'status=running',
      'stage=Pilot validation',
      'progress=42%',
      'current_step=Evaluating validation split',
      'last_update_at=1700000001',
      'blocker=Waiting for the next checkpoint',
    ].join('\n')),
    artifacts: success([
      'id\tkind\tsize_label\tupdated_at\tretention\tpath\tnote',
      'artifact-1\tcheckpoint\t3.2 GB\t1700000002\tkeep for 7 days\t/mnt/experiments/run-1\tLatest checkpoint',
    ].join('\n')),
  })

  assert.equal(snapshot.serverName, 'research-node')
  assert.equal(snapshot.connection.status, 'connected')
  assert.equal(snapshot.connection.lastCheckedAt, 1_700_000_000_000)
  assert.equal(snapshot.gpus[0].memoryUsedGiB, 12)
  assert.equal(snapshot.gpus[0].memoryTotalGiB, 24)
  assert.equal(snapshot.gpus[0].status, 'working')
  assert.equal(snapshot.gpus[1].status, 'idle')
  assert.equal(snapshot.run.progress, 0.42)
  assert.equal(snapshot.run.currentStep, 'Evaluating validation split')
  assert.equal(snapshot.artifacts[0].path, '/mnt/experiments/run-1')
  assert.equal(snapshot.artifacts[0].sizeLabel, '3.2 GB')
})

test('marks a partial collection as degraded and preserves unknown fields', () => {
  const snapshot = parseRemoteConsoleSnapshot({
    serverName: 'configured node',
    gpu: success('0, NVIDIA GeForce RTX 4090, 512, 24576, 0'),
  })

  assert.equal(snapshot.connection.status, 'degraded')
  assert.equal(snapshot.gpus[0].status, 'idle')
  assert.equal(snapshot.run.status, 'unknown')
  assert.equal(snapshot.run.progress, null)
  assert.match(snapshot.notes.join(' '), /missing command output.*hostname|run|artifacts/i)
  assert.match(snapshot.notes.join(' '), /run state is unknown/i)
})

test('marks an SSH command failure as disconnected without inventing telemetry', () => {
  const snapshot = parseRemoteConsoleSnapshot({
    serverName: 'configured node',
    gpu: {
      stdout: '',
      stderr: 'ssh: connect to host 10.0.0.8 port 22: Connection timed out',
      exitCode: 255,
      timedOut: true,
    },
  })

  assert.equal(snapshot.connection.status, 'disconnected')
  assert.equal(snapshot.gpus.length, 1)
  assert.equal(snapshot.gpus[0].status, 'unknown')
  assert.equal(snapshot.gpus[0].memoryUsedGiB, 0)
  assert.equal(snapshot.gpus[0].memoryTotalGiB, 0)
  assert.equal(snapshot.run.status, 'unknown')
  assert.match(snapshot.connection.details, /timed out|failed/i)
})

test('uses unknown when commands return successfully but their format is not parseable', () => {
  const snapshot = parseRemoteConsoleSnapshot({
    serverName: 'configured node',
    hostname: success('research-node'),
    gpu: success('GPU output was changed by the provider'),
    run: success('not a key value report'),
    artifacts: success('not a tab separated report'),
  })

  assert.equal(snapshot.serverName, 'research-node')
  assert.equal(snapshot.connection.status, 'unknown')
  assert.equal(snapshot.gpus[0].status, 'unknown')
  assert.equal(snapshot.run.status, 'unknown')
  assert.equal(snapshot.artifacts.length, 0)
  assert.match(snapshot.notes.join(' '), /could not parse|unknown/i)
})

test('returns an explicit not-configured state when no command outputs exist', () => {
  const snapshot = parseRemoteConsoleSnapshot({ serverName: 'configured node' })

  assert.equal(snapshot.connection.status, 'not-configured')
  assert.equal(snapshot.gpus[0].status, 'unknown')
  assert.equal(snapshot.run.status, 'unknown')
  assert.match(snapshot.connection.details, /no SSH command outputs/i)
})
