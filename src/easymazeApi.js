// Easymaze integration API module

const SETTINGS_KEY = 'flowmaze_easymaze_settings'

export const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://dev-easymaze.mazemateapp.com',
  bearerToken: '',
  defaultCustomerId: '3',
  defaultContactId: '1',
  serviceArea: 'a1',
  serviceType: 't1',
  enabled: false,
  debugMode: false,
  corsProxyUrl: '',
}

export function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function getUrl(settings, path) {
  const base = settings.corsProxyUrl
    ? `${settings.corsProxyUrl.replace(/\/$/, '')}/${settings.apiBaseUrl.replace(/^https?:\/\//, '')}`
    : settings.apiBaseUrl.replace(/\/$/, '')
  return `${base}${path}`
}

function maskToken(token) {
  if (!token || token.length < 10) return '****'
  return `${token.substring(0, 6)}...${token.substring(token.length - 4)}****`
}

function formatTimestamp() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export async function testConnection(settings) {
  const url = getUrl(settings, '/api/integration/store')
  const startTime = performance.now()
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${settings.bearerToken}`,
      },
    })
    const duration = Math.round(performance.now() - startTime)
    if (response.ok || response.status === 200 || response.status === 204 || response.status === 405) {
      return { success: true, message: `Connected (${duration}ms)`, duration }
    }
    return { success: false, message: `HTTP ${response.status}: ${response.statusText}`, duration }
  } catch (err) {
    const duration = Math.round(performance.now() - startTime)
    if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
      return { success: false, message: `Network error — possible CORS issue. Try adding a CORS proxy URL.`, duration }
    }
    return { success: false, message: err.message, duration }
  }
}

export function buildServiceDescription(execution, phase) {
  const md = execution.memberData || {}
  const contract = execution.contract || {}
  const slaClause = contract.clauses?.find(c => c.clause_id === 'SLA-1')
  const validations = execution.validations || []
  const statuses = execution.validationStatuses || []
  const results = execution.validationResults || []
  const audit = execution.auditEntries || []
  const outcome = execution.outcome

  const statusMap = { pass: 'PASS', fail: 'FAIL', warning: 'WARNING', hitl_waiting: 'HITL_WAITING', executing: 'EXECUTING', pending: 'PENDING' }

  const lines = [
    `═══ FLOWMAZE PROCESS RECORD ═══`,
    ``,
    `Process ID: ${execution.processId}`,
    `Status: ${execution.status}`,
    `Priority: ${execution.priority}`,
    `Launched: ${execution.timestampDisplay || execution.timestamp}`,
    phase === 'completion' ? `Completed: ${formatTimestamp()}` : `Phase: Processing...`,
    ``,
    `── MEMBER DATA ──`,
    `Member: ${md.member_name || 'N/A'} (ID: ${md.member_id || 'N/A'})`,
    `Fund Type: ${execution.fundTypeLabel || md.fund_type || 'N/A'}`,
    `Action: ${execution.useCaseLabel || md.use_case || 'N/A'}`,
    md.withdrawal_amount != null ? `Withdrawal Amount: ${md.withdrawal_amount?.toLocaleString()} ₪` : null,
    md.transfer_amount != null ? `Transfer Amount: ${md.transfer_amount?.toLocaleString()} ₪` : null,
    md.redemption_amount != null ? `Redemption Amount: ${md.redemption_amount?.toLocaleString()} ₪` : null,
    md.balance != null ? `Balance: ${md.balance?.toLocaleString()} ₪` : null,
    md.total_balance != null ? `Total Balance: ${md.total_balance?.toLocaleString()} ₪` : null,
    `Phone: ${md.phone || 'N/A'}`,
    `Email: ${md.email || 'N/A'}`,
    ``,
    `── CONTRACT ──`,
    `Contract: ${contract.contract_id || 'N/A'}`,
    `Insurance Company: ${contract.insurance_company || 'N/A'}`,
    `Effective: ${contract.effective_date || 'N/A'} — Expires: ${contract.expiry_date || 'N/A'}`,
    slaClause ? `SLA: ${slaClause.sla_business_days} business days (complex: ${slaClause.sla_complex_business_days} days)` : null,
  ]

  if (phase === 'completion' && validations.length > 0) {
    lines.push(``, `── VALIDATION RESULTS ──`)
    validations.forEach((v, i) => {
      const st = statusMap[statuses[i]] || 'PENDING'
      const res = results[i]
      const hitlTag = v.requires_hitl ? ' (HITL)' : ''
      const detail = res?.message ? ` — ${res.message}` : ''
      lines.push(`${i + 1}. ${v.name}: ${st}${hitlTag}${detail}`)
    })
  }

  if (phase === 'completion' && outcome) {
    lines.push(``, `── OUTCOME ──`)
    lines.push(`Decision: ${outcome.type || 'N/A'}`)
    lines.push(`Details: ${outcome.message || 'N/A'}`)
  }

  if (phase === 'completion' && audit.length > 0) {
    lines.push(``, `── AUDIT TRAIL ──`)
    audit.forEach(a => {
      lines.push(`[${a.timestamp}] ${a.action}: ${a.result} ${a.details || ''}`)
    })
  }

  lines.push(``, `═══ END OF PROCESS RECORD ═══`)

  return lines.filter(l => l != null).join('\n')
}

export async function createEasymazeService(execution, settings, phase) {
  if (!settings.enabled || !settings.bearerToken || !settings.apiBaseUrl) {
    return { skipped: true, reason: 'Integration disabled or not configured' }
  }

  const url = getUrl(settings, '/api/integration/store')
  const description = buildServiceDescription(execution, phase)
  const body = {
    entity_type: 'service',
    contact: settings.defaultContactId,
    customer: settings.defaultCustomerId,
    description,
    area: settings.serviceArea,
    type: settings.serviceType,
    em_debug: settings.debugMode ? 'true' : 'false',
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${settings.bearerToken}`,
  }

  const logEntry = {
    id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: formatTimestamp(),
    name: phase === 'launch' ? 'Easymaze: Create Service' : 'Easymaze: Update Service',
    method: 'POST',
    url,
    isMock: false,
    requestHeaders: {
      ...headers,
      'Authorization': `Bearer ${maskToken(settings.bearerToken)}`,
    },
    requestBody: body,
    responseBody: null,
    statusCode: null,
    duration: null,
    error: null,
  }

  const startTime = performance.now()
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const duration = Math.round(performance.now() - startTime)
    logEntry.duration = duration
    logEntry.statusCode = response.status

    let responseData
    try {
      responseData = await response.json()
    } catch {
      responseData = await response.text?.() || null
    }
    logEntry.responseBody = responseData

    if (response.ok) {
      const serviceId = responseData?.data?.id || responseData?.id || null
      const serviceNumber = responseData?.data?.service_number || responseData?.service_number || serviceId
      return { success: true, serviceId, serviceNumber, logEntry, responseData }
    } else {
      logEntry.error = `HTTP ${response.status}: ${response.statusText}`
      return { success: false, error: logEntry.error, logEntry, responseData }
    }
  } catch (err) {
    const duration = Math.round(performance.now() - startTime)
    logEntry.duration = duration
    const isCors = err.message?.includes('Failed to fetch') || err.name === 'TypeError'
    logEntry.error = isCors
      ? 'CORS error — the Easymaze API may need to allowlist this domain, or use a CORS proxy for testing.'
      : err.message
    logEntry.statusCode = 0
    return { success: false, error: logEntry.error, logEntry }
  }
}
