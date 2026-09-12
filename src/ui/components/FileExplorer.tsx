import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, ChevronDown, Search, Upload, Plus } from 'lucide-react'

type FileExplorerProps = {
  projectPath: string | null
  onOpenFile: (filePath: string) => void
  onUploadPaper: () => void
}

type FileEntry = {
  name: string
  isDirectory: boolean
  path: string
  children?: FileEntry[]
}

export function FileExplorer({ projectPath, onOpenFile, onUploadPaper }: FileExplorerProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectPath) {
      loadFiles(projectPath)
    }
  }, [projectPath])

  async function loadFiles(dirPath: string) {
    setLoading(true)
    try {
      const entries = await window.electronAPI.readDir(dirPath)
      const fileEntries: FileEntry[] = entries
        .filter((entry: any) => !entry.name.startsWith('.'))
        .map((entry: any) => ({
          name: entry.name,
          isDirectory: entry.isDirectory,
          path: entry.path,
        }))
      setFiles(fileEntries)
    } catch (error) {
      console.error('Failed to load files:', error)
    }
    setLoading(false)
  }

  function toggleDir(dirPath: string) {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath)
    } else {
      newExpanded.add(dirPath)
    }
    setExpandedDirs(newExpanded)
  }

  function filteredFiles(files: FileEntry[]): FileEntry[] {
    if (!searchQuery) return files
    
    return files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  function renderFileEntry(entry: FileEntry, depth: number = 0) {
    const isExpanded = expandedDirs.has(entry.path)
    const paddingLeft = `${depth * 16 + 8}px`
    
    return (
      <div key={entry.path}>
        <button
          className="file-entry"
          style={{ paddingLeft }}
          onClick={() => {
            if (entry.isDirectory) {
              toggleDir(entry.path)
            } else {
              onOpenFile(entry.path)
            }
          }}
        >
          {entry.isDirectory ? (
            <>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className="file-icon folder" />
            </>
          ) : (
            <>
              <span style={{ width: 14 }} />
              <File size={14} className="file-icon" />
            </>
          )}
          <span className="file-name">{entry.name}</span>
        </button>
        
        {entry.isDirectory && isExpanded && (
          <div className="file-children">
            {loading ? (
              <div className="file-loading">加载中...</div>
            ) : (
              <div className="file-placeholder">需要递归加载子目录</div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!projectPath) {
    return (
      <div className="file-explorer empty">
        <div className="file-explorer-empty">
          <Folder size={48} />
          <p>打开一个文件夹开始</p>
        </div>
      </div>
    )
  }

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <div className="file-explorer-title">
          <Folder size={16} />
          <span>{projectPath.split(/[/\\]/).pop()}</span>
        </div>
        <div className="file-explorer-actions">
          <button className="icon-button small" onClick={onUploadPaper} title="上传论文">
            <Upload size={14} />
          </button>
        </div>
      </div>
      
      <div className="file-explorer-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="file-explorer-tree">
        {filteredFiles(files).map(file => renderFileEntry(file))}
      </div>
      
      <div className="file-explorer-footer">
        <button className="file-explorer-add" onClick={onUploadPaper}>
          <Plus size={14} />
          上传论文
        </button>
      </div>
    </div>
  )
}
