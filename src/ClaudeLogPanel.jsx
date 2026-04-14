import { useT } from './i18n'

function formatTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', { hour12: false })
  } catch {
    return iso
  }
}

function Section({ title, value, onCopy }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-accent uppercase tracking-wider">{title}</h4>
        <button
          onClick={onCopy}
          className="text-[10px] text-accent hover:text-accent/80 transition-colors border border-border rounded px-2 py-1 flex items-center gap-1"
        >
          📋 Copy
        </button>
      </div>
      <pre className="text-[11px] font-mono text-text-primary bg-bg-primary rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto border border-border">
        {value}
      </pre>
    </div>
  )
}

export default function ClaudeLogPanel({ execution }) {
  const t = useT()
  const log = execution?.claudeLog

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-bg-card border border-border flex items-center justify-center mb-3">
          <span className="text-text-muted text-lg">💬</span>
        </div>
        <p className="text-sm text-text-muted">{t('claudeLog.empty')}</p>
        <p className="text-xs text-text-muted mt-1">{t('claudeLog.empty.desc')}</p>
      </div>
    )
  }

  const copy = (v) => navigator.clipboard.writeText(v)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div>
          <span className="text-[10px] text-text-muted uppercase block">{t('claudeLog.model')}</span>
          <span className="text-text-primary font-mono">{log.model}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase block">{t('claudeLog.requestedAt')}</span>
          <span className="text-text-primary font-mono">{formatTs(log.requestedAt)}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase block">{t('claudeLog.respondedAt')}</span>
          <span className="text-text-primary font-mono">{formatTs(log.respondedAt)}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase block">{t('claudeLog.tokens')}</span>
          <span className="text-text-primary font-mono">
            {log.usage ? `${log.usage.input_tokens ?? '?'} → ${log.usage.output_tokens ?? '?'}` : '—'}
          </span>
        </div>
      </div>

      <Section
        title={t('claudeLog.system')}
        value={log.system}
        onCopy={() => copy(log.system)}
      />
      <Section
        title={t('claudeLog.user')}
        value={log.userMessage}
        onCopy={() => copy(log.userMessage)}
      />
      <Section
        title={log.error ? t('claudeLog.errorResponse') : t('claudeLog.response')}
        value={log.rawResponse}
        onCopy={() => copy(log.rawResponse)}
      />
    </div>
  )
}
