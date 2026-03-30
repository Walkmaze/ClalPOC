import { useState } from 'react'

function StatusBadge({ code }) {
  if (!code && code !== 0) return null
  const color = code === 0 ? 'bg-error/20 text-error'
    : code >= 200 && code < 300 ? 'bg-success/20 text-success'
    : code >= 400 && code < 500 ? 'bg-warning/20 text-warning'
    : code >= 500 ? 'bg-error/20 text-error'
    : 'bg-border text-text-muted'
  const label = code === 0 ? 'Network Error' : `${code}`
  return <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
}

function JsonBlock({ data }) {
  if (!data) return <span className="text-text-muted text-xs italic">No data</span>
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return (
    <pre className="text-[11px] font-mono text-accent/80 bg-bg-primary rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
      {text}
    </pre>
  )
}

function ExpandableSection({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors py-1"
      >
        <span className="text-[10px]">{open ? '▾' : '▸'}</span>
        {label}
      </button>
      {open && <div className="mt-1 ml-3">{children}</div>}
    </div>
  )
}

function ApiLogEntry({ entry, index }) {
  const isMock = entry.isMock
  return (
    <div className="bg-bg-primary rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] text-text-muted font-mono">#{index + 1}</span>
            <span className="text-sm font-semibold text-text-primary">{entry.name}</span>
            {isMock && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">Mock</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
            <span className="text-accent">{entry.method}</span>
            <span className="truncate">{entry.url}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge code={entry.statusCode} />
          {entry.duration != null && (
            <span className="text-[10px] text-text-muted font-mono">{entry.duration}ms</span>
          )}
          <span className="text-[10px] text-text-muted">{entry.timestamp}</span>
        </div>
      </div>

      {/* Error message */}
      {entry.error && (
        <div className="mx-4 mb-3 bg-error/10 border border-error/30 rounded-lg px-3 py-2 text-xs text-error">
          {entry.error}
        </div>
      )}

      {/* Expandable sections */}
      <div className="px-4 pb-3 space-y-1">
        {entry.requestHeaders && (
          <ExpandableSection label="Request Headers">
            <JsonBlock data={entry.requestHeaders} />
          </ExpandableSection>
        )}
        {entry.requestBody && (
          <ExpandableSection label="Request Body">
            <JsonBlock data={entry.requestBody} />
          </ExpandableSection>
        )}
        {entry.responseBody !== undefined && entry.responseBody !== null && (
          <ExpandableSection label="Response Body">
            <JsonBlock data={entry.responseBody} />
          </ExpandableSection>
        )}
      </div>
    </div>
  )
}

export default function ApiLogsPanel({ apiLogs }) {
  if (!apiLogs || apiLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-bg-card border border-border flex items-center justify-center mb-3">
          <span className="text-text-muted text-lg">🔌</span>
        </div>
        <p className="text-sm text-text-muted">No API calls recorded yet.</p>
        <p className="text-xs text-text-muted mt-1">API calls will appear here as the flow executes.</p>
      </div>
    )
  }

  const realCount = apiLogs.filter(l => !l.isMock).length
  const mockCount = apiLogs.filter(l => l.isMock).length
  const errorCount = apiLogs.filter(l => l.error).length

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4 text-xs text-text-muted">
        <span>{apiLogs.length} total calls</span>
        {realCount > 0 && <span className="text-accent">{realCount} real</span>}
        {mockCount > 0 && <span className="text-purple-400">{mockCount} mock</span>}
        {errorCount > 0 && <span className="text-error">{errorCount} failed</span>}
      </div>

      {/* Log entries */}
      <div className="space-y-3">
        {apiLogs.map((entry, i) => (
          <ApiLogEntry key={entry.id || i} entry={entry} index={i} />
        ))}
      </div>
    </div>
  )
}
