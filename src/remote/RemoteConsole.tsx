import {
  Archive,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Cpu,
  HardDrive,
  Power,
  Server,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { RemoteCompletionPolicyPreview, RemoteConsoleSnapshot } from './console.ts'
import { summarizeRemoteConsole } from './console.ts'
import './RemoteConsole.css'

export type RemoteConsoleProps = {
  snapshot: RemoteConsoleSnapshot
  onSelectPolicy?: (policy: RemoteCompletionPolicyPreview) => void
  className?: string
}

export function RemoteConsole({ snapshot, onSelectPolicy, className }: RemoteConsoleProps) {
  const summary = summarizeRemoteConsole(snapshot)
  const rootClassName = ['remote-console', className].filter(Boolean).join(' ')

  return (
    <section className={rootClassName} aria-label="Remote experiment console">
      <header className="remote-console__header">
        <div>
          <p className="remote-console__eyebrow">Read-only remote preview</p>
          <h2>{snapshot.serverName || 'Remote server'}</h2>
        </div>
        <ConnectionBadge snapshot={snapshot} />
      </header>

      <div className="remote-console__summary" aria-label="Remote summary">
        <SummaryItem icon={<Server size={14} />} label="Connection" value={summary.connection} />
        <SummaryItem icon={<Cpu size={14} />} label="GPUs" value={summary.gpus} />
        <SummaryItem icon={<Timer size={14} />} label="Run" value={summary.run} />
        <SummaryItem icon={<HardDrive size={14} />} label="Artifacts" value={summary.artifacts} />
      </div>

      <div className="remote-console__stack">
        <section className="remote-console__section" aria-labelledby="remote-gpu-heading">
          <SectionHeading icon={<Cpu size={16} />} id="remote-gpu-heading" title="GPU status" />
          {snapshot.gpus.length === 0 ? (
            <EmptySection copy="No GPU telemetry is available." />
          ) : (
            <div className="remote-console__gpu-list">
              {snapshot.gpus.map((gpu) => (
                <article className="remote-console__gpu" key={gpu.id}>
                  <div className="remote-console__row">
                    <strong>{gpu.name || gpu.id}</strong>
                    <StatusLabel status={gpu.status} />
                  </div>
                  <div className="remote-console__meter" aria-label={`${gpu.memoryUsedGiB} of ${gpu.memoryTotalGiB} GiB memory used`}>
                    <span style={{ width: `${memoryPercent(gpu.memoryUsedGiB, gpu.memoryTotalGiB)}%` }} />
                  </div>
                  <div className="remote-console__meta">
                    <span>{formatMemory(gpu.memoryUsedGiB, gpu.memoryTotalGiB)}</span>
                    <span>{gpu.activeWorkload || 'No active workload'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="remote-console__section" aria-labelledby="remote-run-heading">
          <SectionHeading icon={<Timer size={16} />} id="remote-run-heading" title="Experiment run" />
          <div className="remote-console__run">
            <div className="remote-console__row">
              <strong>{snapshot.run.title || snapshot.run.id}</strong>
              <StatusLabel status={snapshot.run.status} />
            </div>
            <p>{snapshot.run.stage || 'Stage not recorded'}</p>
            {snapshot.run.progress !== null ? (
              <div className="remote-console__progress-row">
                <div className="remote-console__meter" aria-label={`${Math.round(snapshot.run.progress * 100)} percent complete`}>
                  <span style={{ width: `${progressPercent(snapshot.run.progress)}%` }} />
                </div>
                <span>{Math.round(progressPercent(snapshot.run.progress))}%</span>
              </div>
            ) : null}
            <div className="remote-console__meta">
              <span>{snapshot.run.currentStep || 'Current step not recorded'}</span>
              <span>{snapshot.run.blockers.length ? `${snapshot.run.blockers.length} blocker(s)` : 'No blockers recorded'}</span>
            </div>
            {snapshot.run.blockers.length ? (
              <ul className="remote-console__warnings">
                {snapshot.run.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="remote-console__section" aria-labelledby="remote-artifact-heading">
          <SectionHeading icon={<HardDrive size={16} />} id="remote-artifact-heading" title="Disk artifacts" />
          {snapshot.artifacts.length === 0 ? (
            <EmptySection copy="No tracked artifacts are available." />
          ) : (
            <div className="remote-console__artifact-list">
              {snapshot.artifacts.map((artifact) => (
                <article className="remote-console__artifact" key={artifact.id}>
                  <div className="remote-console__row">
                    <strong>{artifact.kind}</strong>
                    <span>{artifact.sizeLabel || 'Size unknown'}</span>
                  </div>
                  <code>{artifact.path || 'Path not recorded'}</code>
                  <small>{artifact.retention || 'Retention not recorded'}</small>
                  {artifact.note ? <p>{artifact.note}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="remote-console__section" aria-labelledby="remote-policy-heading">
          <SectionHeading icon={<ShieldCheck size={16} />} id="remote-policy-heading" title="Completion policy preview" />
          <p className="remote-console__helper">
            These are proposed next actions. Selecting one only returns it to the parent for human review.
          </p>
          <div className="remote-console__policy-list">
            {snapshot.completionPolicies.map((policy) => (
              <PolicyRow policy={policy} key={policy.action} onSelect={onSelectPolicy} />
            ))}
          </div>
        </section>
      </div>

      {snapshot.notes.length ? (
        <footer className="remote-console__notes">
          <CircleAlert size={14} />
          <span>{snapshot.notes.join(' ')}</span>
        </footer>
      ) : null}
    </section>
  )
}

function ConnectionBadge({ snapshot }: { snapshot: RemoteConsoleSnapshot }) {
  const icon = snapshot.connection.status === 'connected' ? <CircleCheck size={14} /> : <CircleDashed size={14} />
  return (
    <span className={`remote-console__connection remote-console__connection--${snapshot.connection.status}`}>
      {icon}
      {snapshot.connection.label || snapshot.connection.status}
    </span>
  )
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="remote-console__summary-item">
      {icon}
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function SectionHeading({ icon, id, title }: { icon: ReactNode; id: string; title: string }) {
  return (
    <div className="remote-console__section-heading">
      <span>{icon}</span>
      <h3 id={id}>{title}</h3>
    </div>
  )
}

function StatusLabel({ status }: { status: string }) {
  return <span className={`remote-console__status remote-console__status--${status}`}>{status.replaceAll('-', ' ')}</span>
}

function PolicyRow({
  policy,
  onSelect,
}: {
  policy: RemoteCompletionPolicyPreview
  onSelect?: (policy: RemoteCompletionPolicyPreview) => void
}) {
  const icon = policy.action === 'save-image-and-stop' ? <Power size={15} /> : policy.action === 'archive-artifacts' ? <Archive size={15} /> : <ShieldCheck size={15} />

  return (
    <article className="remote-console__policy">
      <div className="remote-console__policy-icon">{icon}</div>
      <div className="remote-console__policy-body">
        <div className="remote-console__row">
          <strong>{policy.title}</strong>
          <StatusLabel status={policy.safety} />
        </div>
        <p>{policy.summary}</p>
        <small>{policy.prerequisites[0] || 'No prerequisite recorded'}</small>
      </div>
      {onSelect ? (
        <button type="button" className="remote-console__policy-button" onClick={() => onSelect(policy)}>
          Review
        </button>
      ) : null}
    </article>
  )
}

function EmptySection({ copy }: { copy: string }) {
  return <p className="remote-console__empty">{copy}</p>
}

function memoryPercent(used: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (used / total) * 100))
}

function progressPercent(progress: number): number {
  return Math.min(100, Math.max(0, progress * 100))
}

function formatMemory(used: number, total: number): string {
  return `${used.toFixed(1)} / ${total.toFixed(1)} GiB`
}
