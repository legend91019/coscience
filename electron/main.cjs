const { app, BrowserWindow, session } = require('electron')
const path = require('node:path')
const { startServer, stopServer } = require('./service/main.cjs')

let localService
let isQuitting = false

function createWindow() {
  const window = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#f6f4ed',
    title: 'CoScience',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.COSCIENCE_DEV_URL
  if (devUrl) {
    window.loadURL(devUrl)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  return startServer(Number(process.env.COSCIENCE_SERVICE_PORT) || undefined)
    .then((service) => {
      localService = service
      console.log(`CoScience local service listening at ${service.url}`)
      createWindow()
    })
    .catch((error) => {
      console.error('Failed to start CoScience local service:', error)
      app.quit()
    })
})

app.on('before-quit', (event) => {
  if (isQuitting) return

  event.preventDefault()
  isQuitting = true
  stopServer(localService).finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
