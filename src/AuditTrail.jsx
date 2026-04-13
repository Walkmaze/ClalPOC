import { useState } from 'react'
import { useT, useLoc } from './i18n'

const RESULT_STYLES = {
  SUCCESS: 'text-success',
  COMPLETED: 'text-success',
  PASS: 'text-success',
  FAIL: 'text-error',
  BLOCKED: 'text-error',
  REJECTED: 'text-error',
  WARNING: 'text-warning',
  AWAITING_DOCUMENTS: 'text-warning',
  AWAITING_CONSENT: 'text-warning',
  RUNNING: 'text-accent',
  INFO: 'text-accent',
  PENDING: 'text-text-muted',
}

export default function AuditTrail({ entries, processInfo }) {
  const [expanded, setExpanded] = useState(true)
  const t = useT()
  const loc = useLoc()

  if (!entries || entries.length === 0) return null

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden mt-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-card-hover transition-colors"
      >
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">{t('audit.title')}</h3>
        <span className="text-text-muted text-xs">{expanded ? '▲' : '▼'} {entries.length} {t('audit.entries')}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Process Info */}
          {processInfo && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 bg-bg-primary rounded-lg p-3">
              <div>
                <span className="text-[10px] text-text-muted uppercase">{t('audit.processId')}</span>
                <p className="text-xs font-mono text-accent">{processInfo.processId}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase">{t('audit.member')}</span>
                <p className="text-xs text-text-primary">{processInfo.memberId} — {processInfo.memberName}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase">{t('audit.fundType')}</span>
                <p className="text-xs text-text-primary">{processInfo.fundType}</p>
              </div>
              {processInfo.useCase && (
                <div>
                  <span className="text-[10px] text-text-muted uppercase">{t('audit.action')}</span>
                  <p className="text-xs text-text-primary">{processInfo.useCase}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] text-text-muted uppercase">{t('audit.status')}</span>
                <p className={`text-xs font-semibold ${RESULT_STYLES[processInfo.status] || 'text-text-primary'}`}>{processInfo.status}</p>
              </div>
            </div>
          )}

          {/* Action Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted uppercase text-[10px] border-b border-border">
                  <th className="text-start py-2 px-2 w-8">#</th>
                  <th className="text-start py-2 px-2 w-20">{t('audit.time')}</th>
                  <th className="text-start py-2 px-2">{t('audit.action')}</th>
                  <th className="text-start py-2 px-2 w-24">{t('audit.category')}</th>
                  <th className="text-start py-2 px-2 w-28">{t('audit.source')}</th>
                  <th className="text-start py-2 px-2 w-20">{t('audit.result')}</th>
                  <th className="text-start py-2 px-2">{t('audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 animate-slide-in-left hover:bg-bg-primary/50"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="py-2 px-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 px-2 font-mono text-text-muted">{entry.timestamp}</td>
                    <td className="py-2 px-2 text-text-primary">{loc(entry, 'action')}</td>
                    <td className="py-2 px-2 text-text-muted">{t(`cat.${entry.category}`, entry.category)}</td>
                    <td className="py-2 px-2 font-mono text-text-muted">{entry.source || '—'}</td>
                    <td className={`py-2 px-2 font-semibold ${RESULT_STYLES[entry.result] || 'text-text-muted'}`}>{t(`result.${entry.result}`, entry.result)}</td>
                    <td className="py-2 px-2 text-text-muted max-w-[200px] truncate">{loc(entry, 'details')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
