import { useT, useLoc } from './i18n'

function buildDriverUPayload(execution) {
  if (!execution) return null

  const md = execution.memberData || {}
  const outcome = execution.outcome
  const validations = execution.validations || []
  const statuses = execution.validationStatuses || []
  const results = execution.validationResults || []

  return {
    process_id: execution.processId,
    timestamp: execution.timestamp,
    status: execution.status,
    member: {
      id: md.member_id,
      name: md.member_name,
      name_he: md.member_name_he,
      birth_date: md.birth_date,
      phone: md.phone,
      email: md.email,
      account_number: md.account_number,
    },
    request: {
      fund_type: md.fund_type,
      use_case: md.use_case,
      amount: md.withdrawal_amount || md.transfer_amount || md.redemption_amount || null,
      balance: md.balance || md.total_balance || null,
    },
    validations: validations.map((v, i) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      severity: v.severity,
      status: statuses[i] || 'pending',
      result: results[i] ? { passed: results[i].passed, value: results[i].actual_value } : null,
    })),
    outcome: outcome ? {
      type: outcome.type,
      message: outcome.message,
      ...(outcome.breakdown ? { breakdown: outcome.breakdown } : {}),
    } : null,
    sla_deadline: execution.slaDeadline,
    priority: execution.priority,
  }
}

export default function DriverUPayload({ execution }) {
  const t = useT()

  const payload = buildDriverUPayload(execution)

  if (!payload) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full bg-bg-card border border-border flex items-center justify-center mb-3">
          <span className="text-text-muted text-lg">📦</span>
        </div>
        <p className="text-sm text-text-muted">{t('driverU.empty')}</p>
        <p className="text-xs text-text-muted mt-1">{t('driverU.empty.desc')}</p>
      </div>
    )
  }

  const json = JSON.stringify(payload, null, 2)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-text-muted">{t('driverU.desc')}</p>
        <button
          onClick={() => navigator.clipboard.writeText(json)}
          className="text-[10px] text-accent hover:text-accent/80 transition-colors border border-border rounded px-2 py-1 flex items-center gap-1"
        >
          📋 {t('driverU.copy')}
        </button>
      </div>
      <pre className="text-[11px] font-mono text-accent/80 bg-bg-primary rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto border border-border">
        {json}
      </pre>
    </div>
  )
}
