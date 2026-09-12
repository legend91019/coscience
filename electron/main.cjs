let electron
try {
  electron = require('electron')
} catch {
  // 测试环境
  electron = { app: null, BrowserWindow: null, session: null, dialog: null, ipcMain: null }
}
const { app, BrowserWindow, session, dialog, ipcMain } = electron
const path = require('node:path')
const fs = require('node:fs/promises')
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
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const devUrl = process.env.COSCIENCE_DEV_URL
  if (devUrl) {
    window.loadURL(devUrl)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// IPC 处理程序
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择项目文件夹',
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'PDF文件', extensions: ['pdf'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    title: '选择PDF文件',
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('create-project', async (event, folderPath) => {
  try {
    const coscienceDir = path.join(folderPath, '.coscience')
    const papersDir = path.join(folderPath, 'papers')
    const deepReadDir = path.join(papersDir, 'deep-read')
    const skimReadDir = path.join(papersDir, 'skim-read')
    const experimentsDir = path.join(folderPath, 'experiments')
    const figuresDir = path.join(folderPath, 'figures')
    const writingDir = path.join(folderPath, 'writing')
    
    // 创建目录结构
    await fs.mkdir(coscienceDir, { recursive: true })
    await fs.mkdir(deepReadDir, { recursive: true })
    await fs.mkdir(skimReadDir, { recursive: true })
    await fs.mkdir(experimentsDir, { recursive: true })
    await fs.mkdir(figuresDir, { recursive: true })
    await fs.mkdir(writingDir, { recursive: true })
    
    // 创建项目配置
    const projectConfig = {
      version: '1.0.0',
      name: path.basename(folderPath),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {},
    }
    
    await fs.writeFile(
      path.join(coscienceDir, 'project.json'),
      JSON.stringify(projectConfig, null, 2)
    )
    
    return { success: true, config: projectConfig }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('open-project', async (event, folderPath) => {
  try {
    const configPath = path.join(folderPath, '.coscience', 'project.json')
    const configData = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configData)
    return { success: true, config }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }))
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mkdir', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('upload-paper', async (event, sourcePath, targetDir, category) => {
  try {
    const fileName = path.basename(sourcePath)
    const targetPath = path.join(targetDir, category, fileName)
    
    // 复制文件
    await fs.copyFile(sourcePath, targetPath)
    
    // 创建元数据文件
    const metaData = {
      id: `paper-${Date.now()}`,
      title: path.basename(fileName, path.extname(fileName)),
      filePath: targetPath,
      category,
      uploadedAt: Date.now(),
      tags: [],
    }
    
    const metaPath = path.join(targetDir, category, `${path.basename(fileName, path.extname(fileName))}-meta.json`)
    await fs.writeFile(metaPath, JSON.stringify(metaData, null, 2))
    
    return { success: true, metadata: metaData }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-papers', async (event, papersDir) => {
  try {
    const papers = { 'deep-read': [], 'skim-read': [] }
    
    for (const category of ['deep-read', 'skim-read']) {
      const categoryDir = path.join(papersDir, category)
      try {
        const entries = await fs.readdir(categoryDir)
        for (const entry of entries) {
          if (entry.endsWith('-meta.json')) {
            const metaPath = path.join(categoryDir, entry)
            const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
            papers[category].push(metaData)
          }
        }
      } catch {
        // 目录不存在，跳过
      }
    }
    
    return papers
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('load-threads', async (event, projectDir) => {
  try {
    const threadsDir = path.join(projectDir, '.coscience', 'threads')
    const entries = await fs.readdir(threadsDir).catch(() => [])
    const threads = []
    
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        const threadPath = path.join(threadsDir, entry)
        const threadData = JSON.parse(await fs.readFile(threadPath, 'utf-8'))
        threads.push(threadData)
      }
    }
    
    return threads
  } catch (error) {
    return []
  }
})

ipcMain.handle('save-thread', async (event, projectDir, thread) => {
  try {
    const threadsDir = path.join(projectDir, '.coscience', 'threads')
    await fs.mkdir(threadsDir, { recursive: true })
    
    const threadPath = path.join(threadsDir, `${thread.id}.json`)
    await fs.writeFile(threadPath, JSON.stringify(thread, null, 2))
    
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

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
