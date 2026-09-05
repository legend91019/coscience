import assert from 'node:assert/strict'
import test from 'node:test'

import { startServer, stopServer } from './http.ts'

test('serves health and status JSON with local CORS headers', async () => {
  const service = await startServer(0)

  try {
    const healthResponse = await fetch(`${service.url}/health`)
    assert.equal(healthResponse.status, 200)
    assert.equal(healthResponse.headers.get('content-type'), 'application/json; charset=utf-8')
    assert.equal(healthResponse.headers.get('access-control-allow-origin'), '*')
    assert.deepEqual(await healthResponse.json(), { ok: true })

    const statusResponse = await fetch(`${service.url}/api/status`)
    assert.equal(statusResponse.status, 200)
    const status = await statusResponse.json() as {
      serviceName: string
      process: { pid: number }
    }
    assert.equal(status.serviceName, 'coscience-local-service')
    assert.equal(status.process.pid, process.pid)
  } finally {
    await stopServer(service)
  }
})

test('returns JSON errors for unknown routes and closes cleanly', async () => {
  const service = await startServer(0)

  const missingResponse = await fetch(`${service.url}/missing`)
  assert.equal(missingResponse.status, 404)
  assert.deepEqual(await missingResponse.json(), { error: 'Not found' })

  await stopServer(service)
  await stopServer(service)

  await assert.rejects(
    fetch(`${service.url}/health`),
    /fetch failed|ECONNREFUSED|network/i,
  )
})
