import assert from 'node:assert/strict'
import test from 'node:test'

import { getStatus } from './status.ts'

test('returns current service, process, workspace, and Node runtime status', () => {
  const status = getStatus()

  assert.equal(status.serviceName, 'coscience-local-service')
  assert.equal(status.version, '0.1.0')
  assert.equal(status.process.pid, process.pid)
  assert.ok(status.process.uptimeSeconds >= 0)
  assert.equal(status.cwd, process.cwd())
  assert.equal(status.nodeVersion, process.version)
  assert.equal(status.platform, process.platform)
  assert.equal(status.arch, process.arch)
  assert.ok(status.process.memoryUsage.rss > 0)
})
