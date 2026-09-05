const assert = require('node:assert/strict')
const test = require('node:test')

const packagedService = require('./main.cjs')

test('keeps packaged service status fields aligned with the TypeScript service contract', async () => {
  const sourceService = await import('../../src/service/status.ts')
  const packagedStatus = packagedService.getStatus()
  const sourceStatus = sourceService.getStatus()

  assert.deepEqual(Object.keys(packagedStatus).sort(), Object.keys(sourceStatus).sort())
  assert.deepEqual(Object.keys(packagedStatus.process).sort(), Object.keys(sourceStatus.process).sort())
  assert.equal(packagedStatus.serviceName, sourceStatus.serviceName)
  assert.equal(packagedStatus.version, sourceStatus.version)
  assert.equal(packagedStatus.nodeVersion, sourceStatus.nodeVersion)
  assert.equal(packagedStatus.platform, sourceStatus.platform)
  assert.equal(packagedStatus.arch, sourceStatus.arch)
})
