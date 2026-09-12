import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'

type PaperUploaderProps = {
  projectPath: string
  onUpload: (sourcePath: string, category: 'deep-read' | 'skim-read') => void
  onClose: () => void
}

export function PaperUploader({ projectPath, onUpload, onClose }: PaperUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [category, setCategory] = useState<'deep-read' | 'skim-read'>('deep-read')
  const [uploading, setUploading] = useState(false)

  async function handleSelectFile() {
    // 这里应该调用 Electron 的文件选择对话框
    // 由于在渲染进程中，我们需要通过 IPC 调用
    const filePath = await window.electronAPI.selectFile()
    if (filePath) {
      setSelectedFile(filePath)
    }
  }

  async function handleUpload() {
    if (!selectedFile) return
    
    setUploading(true)
    try {
      const papersDir = `${projectPath}/papers`
      await window.electronAPI.uploadPaper(selectedFile, papersDir, category)
      onUpload(selectedFile, category)
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    }
    setUploading(false)
  }

  return (
    <div className="paper-uploader-overlay">
      <div className="paper-uploader">
        <div className="paper-uploader-header">
          <h2>上传论文</h2>
          <button className="icon-button small" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div className="paper-uploader-content">
          <div className="paper-uploader-file">
            {selectedFile ? (
              <div className="paper-uploader-selected">
                <FileText size={24} />
                <span>{selectedFile.split(/[/\\]/).pop()}</span>
                <button onClick={() => setSelectedFile(null)}>更换</button>
              </div>
            ) : (
              <button className="paper-uploader-select" onClick={handleSelectFile}>
                <Upload size={24} />
                <span>选择PDF文件</span>
              </button>
            )}
          </div>
          
          <div className="paper-uploader-category">
            <label>分类：</label>
            <div className="paper-uploader-options">
              <button
                className={category === 'deep-read' ? 'selected' : ''}
                onClick={() => setCategory('deep-read')}
              >
                精读论文
              </button>
              <button
                className={category === 'skim-read' ? 'selected' : ''}
                onClick={() => setCategory('skim-read')}
              >
                泛读论文
              </button>
            </div>
          </div>
        </div>
        
        <div className="paper-uploader-footer">
          <button onClick={onClose}>取消</button>
          <button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
          >
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
      </div>
    </div>
  )
}
