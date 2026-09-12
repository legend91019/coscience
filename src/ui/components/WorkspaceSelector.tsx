import { Lightbulb, FlaskConical, BarChart3, PenTool } from 'lucide-react'

type WorkspaceSelectorProps = {
  projectName: string
  onSelectWorkspace: (type: 'idea' | 'experiment' | 'figure' | 'writing') => void
}

export function WorkspaceSelector({ projectName, onSelectWorkspace }: WorkspaceSelectorProps) {
  return (
    <div className="workspace-selector">
      <div className="workspace-selector-content">
        <h1>{projectName}</h1>
        <p>选择一个工作区开始</p>
        
        <div className="workspace-options">
          <button 
            className="workspace-option"
            onClick={() => onSelectWorkspace('idea')}
          >
            <div className="workspace-option-icon">
              <Lightbulb size={24} />
            </div>
            <h3>Idea 与方向</h3>
            <p>探索研究方向，形成假设</p>
          </button>
          
          <button 
            className="workspace-option"
            onClick={() => onSelectWorkspace('experiment')}
          >
            <div className="workspace-option-icon">
              <FlaskConical size={24} />
            </div>
            <h3>复现与小规模验证</h3>
            <p>管线验证，Baseline 复现</p>
          </button>
          
          <button 
            className="workspace-option"
            onClick={() => onSelectWorkspace('figure')}
          >
            <div className="workspace-option-icon">
              <BarChart3 size={24} />
            </div>
            <h3>画图</h3>
            <p>图表规划和生成</p>
          </button>
          
          <button 
            className="workspace-option"
            onClick={() => onSelectWorkspace('writing')}
          >
            <div className="workspace-option-icon">
              <PenTool size={24} />
            </div>
            <h3>写作</h3>
            <p>论文撰写和编辑</p>
          </button>
        </div>
      </div>
    </div>
  )
}
