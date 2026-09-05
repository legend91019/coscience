import { KeyRound, Server, SlidersHorizontal } from 'lucide-react'
import type { FormEvent } from 'react'

export type DesktopSettingsState = {
  baseURL: string
  model: string
  apiKey: string
}

type DesktopSettingsProps = {
  value: DesktopSettingsState
  onChange: (next: DesktopSettingsState) => void
  onSave: () => void
  onClose: () => void
}

export function createEmptyDesktopSettings(): DesktopSettingsState {
  return {
    baseURL: '',
    model: '',
    apiKey: '',
  }
}

export function DesktopSettings(props: DesktopSettingsProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    props.onSave()
  }

  return (
    <section className="settings-page" aria-label="桌面设置">
      <header className="settings-header">
        <div>
          <p className="eyebrow">设置页</p>
          <h2>模型接入</h2>
        </div>
        <span className="spine-chip">Bridge 待接入</span>
      </header>

      <form className="settings-form" onSubmit={submit}>
        <label className="field-label">
          <span className="field-label-top">
            <Server size={14} />
            Base URL
          </span>
          <input
            value={props.value.baseURL}
            onChange={(event) => props.onChange({ ...props.value, baseURL: event.currentTarget.value })}
            placeholder="http://127.0.0.1:11434"
          />
        </label>

        <label className="field-label">
          <span className="field-label-top">
            <SlidersHorizontal size={14} />
            Model
          </span>
          <input
            value={props.value.model}
            onChange={(event) => props.onChange({ ...props.value, model: event.currentTarget.value })}
            placeholder="qwen3 / gpt-4.1 / 本地模型名"
          />
        </label>

        <label className="field-label">
          <span className="field-label-top">
            <KeyRound size={14} />
            API Key
          </span>
          <input
            value={props.value.apiKey}
            onChange={(event) => props.onChange({ ...props.value, apiKey: event.currentTarget.value })}
            placeholder="在此输入密钥"
            type="password"
          />
        </label>

        <div className="settings-note">
          这里先保存界面状态；实际服务桥接由主控接入后再把这些值写入运行时。
        </div>

        <div className="settings-actions">
          <button type="button" onClick={props.onClose}>
            返回研究
          </button>
          <button type="submit">保存草稿</button>
        </div>
      </form>
    </section>
  )
}
