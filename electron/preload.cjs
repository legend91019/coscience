const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 文件选择
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // 项目操作
  createProject: (folderPath) => ipcRenderer.invoke('create-project', folderPath),
  openProject: (folderPath) => ipcRenderer.invoke('open-project', folderPath),
  
  // 文件操作
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  mkdir: (dirPath) => ipcRenderer.invoke('mkdir', dirPath),
  
  // 论文操作
  uploadPaper: (sourcePath, targetDir, category) => ipcRenderer.invoke('upload-paper', sourcePath, targetDir, category),
  getPapers: (papersDir) => ipcRenderer.invoke('get-papers', papersDir),
  
  // 对话线程
  loadThreads: (projectDir) => ipcRenderer.invoke('load-threads', projectDir),
  saveThread: (projectDir, thread) => ipcRenderer.invoke('save-thread', projectDir, thread),
  
  // 事件监听
  onProjectOpened: (callback) => ipcRenderer.on('project-opened', callback),
})
