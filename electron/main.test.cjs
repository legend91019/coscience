const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

test('registers the activate handler after Electron becomes ready', async () => {
  const handlers = new Map()
  const fakeApp = {
    whenReady: () => Promise.resolve(),
    on: (event, handler) => handlers.set(event, handler),
    quit: () => {
      quitCalls += 1
    },
  }
  const fakeBrowserWindow = class {
    loadFile() {}
    loadURL() {}

    static getAllWindows() {
      return []
    }
  }
  const originalLoad = Module._load
  const mainPath = path.join(__dirname, 'main.cjs')
  let quitCalls = 0
  let stopCalls = 0

  Module._load = function mockedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: fakeApp,
        BrowserWindow: fakeBrowserWindow,
        session: { defaultSession: { setPermissionRequestHandler: () => {} } },
      }
    }
    if (parent?.filename === mainPath && request === './service/main.cjs') {
      return {
        startServer: async () => ({ url: 'http://127.0.0.1:45123' }),
        stopServer: async () => {
          stopCalls += 1
        },
      }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    delete require.cache[mainPath]
    require(mainPath)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(typeof handlers.get('activate'), 'function')

    const quitEvent = { preventDefault: () => { quitEvent.prevented = true }, prevented: false }
    await handlers.get('before-quit')(quitEvent)
    assert.equal(quitEvent.prevented, true)
    assert.equal(stopCalls, 1)
    assert.equal(quitCalls, 1)
  } finally {
    Module._load = originalLoad
    delete require.cache[mainPath]
  }
})
