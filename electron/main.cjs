const { app, BrowserWindow, session } = require('electron')
const path = require('node:path')

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
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
