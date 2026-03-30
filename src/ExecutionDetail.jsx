import { useState } from 'react'
import FlowExecution from './FlowExecution'
import AuditTrail from './AuditTrail'
import HitlPanel from './HitlPanel'
import ApiLogsPanel from './ApiLogsPanel'

const STATUS_COLORS = {
  RUNNING: 'bg-accent/20 text-accent',
  COMPLETED: 'bg-success/20 text-success',
  BLOCKED: 'bg-error/20 text-error',
  REJECTED: 'bg-error/20 text-error',
  ERROR: 'bg-error/20 text-error',
  AWAITING_DOCUMENTS: 'bg-warning/20 text-warning',
  AWAITING_CONSENT: 'bg-warning/20 text-warning',
  PENDING_APPROVAL: 'bg-warning/20 text-warning',
}

const PRIORITY_COLORS = {
  High: 'bg-error/20 text-error',
  Medium: 'bg-warning/20 text-warning',
  Low: 'bg-success/20 text-success',
}

function formatSlaDeadline(deadline) {
  if (!deadline) return '—'
  const d = new Date(deadline)
  const now = new Date()
  const diff = d - now
  const hoursLeft = Math.round(diff / (1000 * 60 * 60))

  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (hoursLeft < 0) return { text: `${dateStr} ${timeStr} (OVERDUE)`, color: 'text-error' }
  if (hoursLeft < 24) return { text: `${dateStr} ${timeStr} (${hoursLeft}h left)`, color: 'text-warning' }
  return { text: `${dateStr} ${timeStr}`, color: 'text-text-primary' }
}

export default function ExecutionDetail({ execution, onApprove, onReject, onBack, onHitlResolve }) {
  const [hitlValidationIndex, setHitlValidationIndex] = useState(null)
  const [activeDetailTab, setActiveDetailTab] = useState('flow')

  if (!execution) return null

  const sla = formatSlaDeadline(execution.slaDeadline)

  // Find HITL validation that's waiting
  const hitlWaitingIndex = hitlValidationIndex !== null ? hitlValidationIndex
    : execution.validationStatuses?.findIndex(s => s === 'hitl_waiting')
  const hitlValidation = hitlWaitingIndex >= 0 ? execution.validations?.[hitlWaitingIndex] : null
  const showHitlPanel = hitlValidation && hitlValidationIndex !== null

  const handleHitlCardClick = (validationIndex) => {
    if (execution.validationStatuses?.[validationIndex] === 'hitl_waiting') {
      setHitlValidationIndex(validationIndex)
    }
  }

  const handleHitlResolve = (validationIndex, decision, stepData) => {
    setHitlValidationIndex(null)
    onHitlResolve?.(execution.id, validationIndex, decision, stepData)
  }

  const apiLogCount = execution.apiLogs?.length || 0

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-accent text-sm flex items-center gap-1 transition-colors"
        >
          <span>←</span> Back to Executions
        </button>
      </div>

      {/* Process info bar */}
      <div className="bg-bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div>
            <span className="text-[10px] text-text-muted uppercase">Process ID</span>
            <p className="text-sm font-mono text-accent">{execution.processId}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Member</span>
            <p className="text-sm text-text-primary">{execution.memberName}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Fund Type</span>
            <p className="text-sm text-text-primary">{execution.fundTypeLabel}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Action</span>
            <p className="text-sm text-text-primary">{execution.useCaseLabel}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Priority</span>
            <p className={`text-xs font-semibold inline-block px-2 py-0.5 rounded-full ${PRIORITY_COLORS[execution.priority] || 'text-text-muted'}`}>
              {execution.priority}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">SLA Deadline</span>
            <p className={`text-xs font-mono ${sla.color || 'text-text-primary'}`}>{sla.text || sla}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Status</span>
            <p className={`text-xs font-semibold inline-block px-2 py-0.5 rounded-full ${STATUS_COLORS[execution.status] || 'text-text-muted'}`}>
              {execution.status}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">Easymaze</span>
            <p className="text-xs">
              {execution.easymazeStatus === 'synced' ? (
                <a
                  href={`https://app.dev-easymaze.mazemateapp.com/services/${execution.easymazeServiceId || execution.easymazeServiceNumber || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-success hover:text-success/80 transition-colors inline-flex items-center gap-1"
                  title={`Open Service in Easymaze`}
                >
                  🔗 {execution.easymazeServiceNumber || execution.easymazeServiceId ? `#${execution.easymazeServiceNumber || execution.easymazeServiceId}` : 'Synced'}
                  <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : execution.easymazeStatus === 'failed' ? (
                <span className="text-error" title={execution.easymazeError || 'Failed'}>⚠️🔗 Failed</span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {execution.error && (
        <div className="mb-4 bg-error/10 border border-error rounded-lg p-4 text-sm text-error">
          {execution.error}
        </div>
      )}

      {/* Detail tabs: Flow / API Logs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setActiveDetailTab('flow')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeDetailTab === 'flow' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary border border-border'
          }`}
        >
          Flow Execution
        </button>
        <button
          onClick={() => setActiveDetailTab('apiLogs')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeDetailTab === 'apiLogs' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary border border-border'
          }`}
        >
          🔌 API Logs
          {apiLogCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeDetailTab === 'apiLogs' ? 'bg-bg-primary/30 text-bg-primary' : 'bg-accent/20 text-accent'}`}>
              {apiLogCount}
            </span>
          )}
        </button>
      </div>

      {/* Flow + HITL Panel layout */}
      {activeDetailTab === 'flow' && (
        <div className="flex gap-0">
          <div className={`flex-1 min-w-0 ${showHitlPanel ? 'mr-4' : ''}`}>
            <FlowExecution
              analysisMessages={execution.analysisMessages}
              validations={execution.validations}
              validationStatuses={execution.validationStatuses}
              validationResults={execution.validationResults}
              outcome={execution.outcome}
              onApprove={onApprove}
              onReject={onReject}
              useCase={execution.useCase}
              memberData={execution.memberData}
              onHitlCardClick={handleHitlCardClick}
            />

            <AuditTrail
              entries={execution.auditEntries}
              processInfo={{
                processId: execution.processId,
                memberId: execution.memberData?.member_id,
                memberName: execution.memberName,
                fundType: execution.fundTypeLabel,
                useCase: execution.useCaseLabel,
                status: execution.status,
              }}
            />
          </div>

          {showHitlPanel && (
            <HitlPanel
              validation={hitlValidation}
              validationIndex={hitlValidationIndex}
              onResolve={handleHitlResolve}
              onClose={() => setHitlValidationIndex(null)}
            />
          )}
        </div>
      )}

      {/* API Logs tab */}
      {activeDetailTab === 'apiLogs' && (
        <div className="bg-bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
            API Call Log for {execution.processId}
          </h3>
          <ApiLogsPanel apiLogs={execution.apiLogs} />
        </div>
      )}
    </div>
  )
}
