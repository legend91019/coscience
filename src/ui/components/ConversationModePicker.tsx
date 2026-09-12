import { BarChart3, FlaskConical, Lightbulb, PenLine, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { WorkspaceType } from '../domain-adapter.ts'

type ConversationModePickerProps = {
  projectName: string
  onSelect: (mode: WorkspaceType) => void
  onClose: () => void
}

const options: Array<{
  mode: WorkspaceType
  label: string
  description: string
  icon: typeof Lightbulb
}> = [
  { mode: 'idea', label: 'Idea', description: '探索方向与形成假设。', icon: Lightbulb },
  { mode: 'experiment', label: '实验', description: '规划验证、记录证据与决策。', icon: FlaskConical },
  { mode: 'figure', label: '画图', description: '规划图表与来源映射。', icon: BarChart3 },
  { mode: 'writing', label: '写论文', description: '组织已验收证据与论文草稿。', icon: PenLine },
]

export function ConversationModePicker(props: ConversationModePickerProps) {
  const [selectedMode, setSelectedMode] = useState<WorkspaceType | null>(null)

  useEffect(() => {
    setSelectedMode(null)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') props.onClose()
  }

  return (
    <div className="conversation-mode-overlay" onMouseDown={(event) => {
      if (event.currentTarget === event.target) props.onClose()
    }}>
      <div
        className="conversation-mode-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-mode-title"
        onKeyDown={handleKeyDown}
      >
        <header className="conversation-mode-header">
          <div>
            <p className="eyebrow">新对话</p>
            <h2 id="conversation-mode-title">选择 {props.projectName} 的对话模式</h2>
            <p>模式确认后会固定，之后不能修改。</p>
          </div>
          <button className="icon-button quiet" type="button" aria-label="关闭" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="conversation-mode-options" role="radiogroup" aria-label="对话模式">
          {options.map(({ mode, label, description, icon: Icon }) => (
            <button
              className={selectedMode === mode ? 'conversation-mode-option selected' : 'conversation-mode-option'}
              type="button"
              role="radio"
              aria-checked={selectedMode === mode}
              key={mode}
              onClick={() => setSelectedMode(mode)}
            >
              <span className={`conversation-mode-icon conversation-mode-icon--${mode}`}>
                <Icon size={18} />
              </span>
              <span className="conversation-mode-copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <span className="conversation-mode-check" aria-hidden="true" />
            </button>
          ))}
        </div>

        <footer className="conversation-mode-footer">
          <button className="button-secondary" type="button" onClick={props.onClose}>
            取消
          </button>
          <button type="button" disabled={selectedMode === null} onClick={() => selectedMode && props.onSelect(selectedMode)}>
            创建对话
          </button>
        </footer>
      </div>
    </div>
  )
}
