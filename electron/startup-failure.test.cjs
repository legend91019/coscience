const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

test('quits cleanly when the local service cannot start', async () => {
  let quitCalls = 0
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
  const mainPath = path.join(__dirname, 'main.cjs')
  const originalLoad = Module._load
  const originalError = console.error

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
        startServer: async () => {
          throw new Error('EADDRINUSE')
        },
        stopServer: async () => {},
      }
    }
    return originalLoad.call(this, request, parent, isMain)
  }
  console.error = () => {}

  try {
    delete require.cache[mainPath]
    require(mainPath)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(quitCalls, 1)
    assert.equal(typeof handlers.get('before-quit'), 'function')
  } finally {
    Module._load = originalLoad
    console.error = originalError
    delete require.cache[mainPath]
  }
})
