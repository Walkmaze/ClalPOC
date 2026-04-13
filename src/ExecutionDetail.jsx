import { useState } from 'react'
import FlowExecution from './FlowExecution'
import AuditTrail from './AuditTrail'
import HitlPanel from './HitlPanel'
import DriverUPayload from './ApiLogsPanel'
import { useT } from './i18n'

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
  const t = useT()

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

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-accent text-sm flex items-center gap-1 transition-colors"
        >
          <span>←</span> {t('detail.back')}
        </button>
      </div>

      {/* Process info bar */}
      <div className="bg-bg-card rounded-xl border border-border p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.processId')}</span>
            <p className="text-sm font-mono text-accent">{execution.processId}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.member')}</span>
            <p className="text-sm text-text-primary">{execution.memberName}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.fundType')}</span>
            <p className="text-sm text-text-primary">{execution.fundTypeLabel}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.action')}</span>
            <p className="text-sm text-text-primary">{execution.useCaseLabel}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.priority')}</span>
            <p className={`text-xs font-semibold inline-block px-2 py-0.5 rounded-full ${PRIORITY_COLORS[execution.priority] || 'text-text-muted'}`}>
              {t(`priority.${execution.priority}`, execution.priority)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.slaDeadline')}</span>
            <p className={`text-xs font-mono ${sla.color || 'text-text-primary'}`}>{sla.text || sla}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase">{t('detail.status')}</span>
            <p className={`text-xs font-semibold inline-block px-2 py-0.5 rounded-full ${STATUS_COLORS[execution.status] || 'text-text-muted'}`}>
              {t(`status.${execution.status}`, execution.status)}
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
          {t('detail.flowExecution')}
        </button>
        <button
          onClick={() => setActiveDetailTab('payload')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeDetailTab === 'payload' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-muted hover:text-text-primary border border-border'
          }`}
        >
          📦 {t('detail.driverUPayload')}
        </button>
      </div>

      {/* Flow + HITL Panel layout */}
      {activeDetailTab === 'flow' && (
        <div className="flex gap-0">
          <div className={`flex-1 min-w-0 ${showHitlPanel ? 'me-4' : ''}`}>
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

      {/* DriverU Payload tab */}
      {activeDetailTab === 'payload' && (
        <div className="bg-bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
            {t('detail.driverUPayload')} — {execution.processId}
          </h3>
          <DriverUPayload execution={execution} />
        </div>
      )}
    </div>
  )
}
