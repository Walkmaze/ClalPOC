import { useState, useMemo } from 'react'
import { useT } from './i18n'

const STATUS_CONFIG = {
  RUNNING:            { tKey: 'status.RUNNING',           color: 'bg-blue-500/20 text-blue-400',   dot: 'bg-blue-400', pulse: true },
  COMPLETED:          { tKey: 'status.COMPLETED',         color: 'bg-success/20 text-success',     dot: 'bg-success' },
  BLOCKED:            { tKey: 'status.FAILED',            color: 'bg-error/20 text-error',         dot: 'bg-error' },
  REJECTED:           { tKey: 'status.FAILED',            color: 'bg-error/20 text-error',         dot: 'bg-error' },
  ERROR:              { tKey: 'status.FAILED',            color: 'bg-error/20 text-error',         dot: 'bg-error' },
  PENDING_APPROVAL:   { tKey: 'status.PENDING_APPROVAL',  color: 'bg-warning/20 text-warning',     dot: 'bg-warning' },
  AWAITING_DOCUMENTS: { tKey: 'status.AWAITING_CUSTOMER', color: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400' },
  AWAITING_CONSENT:   { tKey: 'status.AWAITING_CUSTOMER', color: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400' },
  CANCELLED:          { tKey: 'status.CANCELLED',         color: 'bg-text-muted/20 text-text-muted', dot: 'bg-text-muted' },
}

const PRIORITY_CONFIG = {
  High:   { color: 'bg-error/20 text-error',     dot: '🔴' },
  Medium: { color: 'bg-warning/20 text-warning',  dot: '🟡' },
  Low:    { color: 'bg-success/20 text-success',  dot: '🟢' },
}

function getStatusGroup(status) {
  if (status === 'RUNNING') return 'running'
  if (status === 'COMPLETED') return 'success'
  if (status === 'BLOCKED' || status === 'REJECTED' || status === 'ERROR') return 'failed'
  if (status === 'PENDING_APPROVAL') return 'hitl'
  if (status === 'AWAITING_DOCUMENTS' || status === 'AWAITING_CONSENT') return 'awaiting'
  if (status === 'CANCELLED') return 'cancelled'
  return 'other'
}

function formatRelativeTime(isoString, t) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return t('time.justNow')
  if (diffMin < 60) return `${diffMin} ${t('time.minAgo')}`
  if (diffHrs < 24) {
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${t('time.today')} ${timeStr}`
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatSlaRemaining(slaDeadline, contract, t) {
  if (!slaDeadline) return { text: '—', color: 'text-text-muted', warn: false }
  const deadline = new Date(slaDeadline)
  const now = new Date()
  const diffMs = deadline - now
  const diffHrs = diffMs / 3600000
  const diffDays = diffMs / 86400000

  // Calculate total SLA duration to determine 20% threshold
  let totalSlaDays = 5
  if (contract?.clauses) {
    const slaClause = contract.clauses.find(c => c.clause_id === 'SLA-1')
    if (slaClause) totalSlaDays = slaClause.sla_business_days || 5
  }
  const totalSlaMs = totalSlaDays * 24 * 3600000
  const pctRemaining = diffMs / totalSlaMs

  if (diffMs < 0) return { text: t('time.breached'), color: 'text-error', warn: true, breached: true }
  if (pctRemaining < 0.2) {
    const label = diffHrs < 24 ? `${Math.ceil(diffHrs)} ${t('time.hLeft')}` : `${Math.ceil(diffDays)} ${t('time.dLeft')}`
    return { text: label, color: 'text-warning', warn: true }
  }
  if (diffDays < 1) return { text: `${Math.ceil(diffHrs)} ${t('time.hLeft')}`, color: 'text-text-primary', warn: false }
  return { text: `${Math.ceil(diffDays)} ${t('time.dLeft')}`, color: 'text-text-primary', warn: false }
}

const SORT_FIELDS = {
  processId: (a, b) => a.processId.localeCompare(b.processId),
  memberName: (a, b) => a.memberName.localeCompare(b.memberName),
  fundTypeLabel: (a, b) => a.fundTypeLabel.localeCompare(b.fundTypeLabel),
  status: (a, b) => a.status.localeCompare(b.status),
  priority: (a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 }
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3)
  },
  slaDeadline: (a, b) => new Date(a.slaDeadline || 0) - new Date(b.slaDeadline || 0),
  timestamp: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  useCaseLabel: (a, b) => (a.useCaseLabel || '').localeCompare(b.useCaseLabel || ''),
}

export default function ExecutionsList({ executions, onSelect, onGoToBuilder, onFlood }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [fundTypeFilter, setFundTypeFilter] = useState('')
  const [sortField, setSortField] = useState('timestamp')
  const [sortAsc, setSortAsc] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const t = useT()

  // Unique fund types for filter dropdown
  const fundTypes = useMemo(() => {
    const types = [...new Set(executions.map(e => e.fundTypeLabel))].sort()
    return [{ value: '', label: t('executions.allFundTypes') }, ...types.map(ft => ({ value: ft, label: ft }))]
  }, [executions, t])

  // Summary stats
  const stats = useMemo(() => {
    const s = { total: executions.length, success: 0, failed: 0, running: 0, hitl: 0 }
    executions.forEach(e => {
      const group = getStatusGroup(e.status)
      if (group === 'success') s.success++
      else if (group === 'failed') s.failed++
      else if (group === 'running') s.running++
      else if (group === 'hitl') s.hitl++
    })
    return s
  }, [executions])

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = [...executions]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.processId.toLowerCase().includes(q) ||
        e.memberName.toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      list = list.filter(e => getStatusGroup(e.status) === statusFilter)
    }

    if (priorityFilter) {
      list = list.filter(e => e.priority === priorityFilter)
    }

    if (fundTypeFilter) {
      list = list.filter(e => e.fundTypeLabel === fundTypeFilter)
    }

    const cmp = SORT_FIELDS[sortField] || SORT_FIELDS.timestamp
    list.sort((a, b) => sortAsc ? cmp(a, b) : -cmp(a, b))

    return list
  }, [executions, search, statusFilter, priorityFilter, fundTypeFilter, sortField, sortAsc])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const SortHeader = ({ field, children }) => (
    <th
      onClick={() => handleSort(field)}
      className="text-start py-3 px-4 cursor-pointer hover:text-text-primary select-none transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-accent">{sortAsc ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  )

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{t('executions.empty.title')}</h3>
        <p className="text-sm text-text-muted mb-4">{t('executions.empty.text')}</p>
        <div className="flex items-center gap-3">
          {onGoToBuilder && (
            <button
              onClick={onGoToBuilder}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {t('executions.empty.goToBuilder')} →
            </button>
          )}
          {onFlood && (
            <button
              onClick={() => onFlood(10)}
              className="bg-warning hover:bg-warning/80 text-bg-primary font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-1.5"
            >
              🚀 {t('executions.empty.flood')}
            </button>
          )}
        </div>
      </div>
    )
  }

  const hasActiveFilters = search || statusFilter || priorityFilter || fundTypeFilter

  return (
    <div>
      {/* Summary stats bar */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <StatCard label={t('executions.total')} value={stats.total} color="text-text-primary" bg="bg-bg-card" active={!statusFilter} onClick={() => setStatusFilter('')} />
        <StatCard label={t('executions.success')} value={stats.success} color="text-success" bg="bg-success/5" dot="bg-success" active={statusFilter === 'success'} onClick={() => setStatusFilter(statusFilter === 'success' ? '' : 'success')} />
        <StatCard label={t('executions.failed')} value={stats.failed} color="text-error" bg="bg-error/5" dot="bg-error" active={statusFilter === 'failed'} onClick={() => setStatusFilter(statusFilter === 'failed' ? '' : 'failed')} />
        <StatCard label={t('executions.running')} value={stats.running} color="text-blue-400" bg="bg-blue-500/5" dot="bg-blue-400" pulse active={statusFilter === 'running'} onClick={() => setStatusFilter(statusFilter === 'running' ? '' : 'running')} />
        <StatCard label={t('executions.needsHitl')} value={stats.hitl} color="text-warning" bg="bg-warning/5" dot="bg-warning" active={statusFilter === 'hitl'} onClick={() => setStatusFilter(statusFilter === 'hitl' ? '' : 'hitl')} />
      </div>

      {/* Header bar with search and filters */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">{t('executions.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              showFilters || hasActiveFilters
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border bg-bg-card text-text-muted hover:text-text-primary'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t('executions.filter')}
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </button>
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('executions.search')}
              className="bg-bg-card border border-border rounded-lg ps-8 pe-3 py-1.5 text-xs text-text-primary placeholder-text-muted/50 focus:border-accent focus:outline-none w-52"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-3 mb-4 bg-bg-card rounded-lg border border-border p-3 animate-fade-in-up">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">{t('executions.allStatuses')}</option>
            <option value="running">{t('executions.running')}</option>
            <option value="success">{t('executions.success')}</option>
            <option value="failed">{t('executions.failed')}</option>
            <option value="hitl">{t('executions.needsHitl')}</option>
            <option value="awaiting">{t('status.AWAITING_CUSTOMER')}</option>
            <option value="cancelled">{t('status.CANCELLED')}</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">{t('executions.allPriorities')}</option>
            <option value="High">{t('priority.High')}</option>
            <option value="Medium">{t('priority.Medium')}</option>
            <option value="Low">{t('priority.Low')}</option>
          </select>
          <select
            value={fundTypeFilter}
            onChange={e => setFundTypeFilter(e.target.value)}
            className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            {fundTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setFundTypeFilter('') }}
              className="text-[10px] text-text-muted hover:text-error transition-colors ms-auto"
            >
              {t('executions.clearAll')}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-[10px] uppercase border-b border-border">
              <SortHeader field="processId">{t('executions.processId')}</SortHeader>
              <SortHeader field="memberName">{t('executions.member')}</SortHeader>
              <SortHeader field="fundTypeLabel">{t('executions.fundType')}</SortHeader>
              <SortHeader field="status">{t('executions.status')}</SortHeader>
              <SortHeader field="priority">{t('executions.priority')}</SortHeader>
              <SortHeader field="slaDeadline">{t('executions.sla')}</SortHeader>
              <SortHeader field="timestamp">{t('executions.launched')}</SortHeader>
              <SortHeader field="useCaseLabel">{t('executions.action')}</SortHeader>
              <th className="py-3 px-2 w-8 text-center text-text-muted text-[10px] uppercase">{t('executions.sync')}</th>
              <th className="py-3 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(exec => {
              const statusCfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.RUNNING
              const priorityCfg = PRIORITY_CONFIG[exec.priority] || PRIORITY_CONFIG.Low
              const sla = formatSlaRemaining(exec.slaDeadline, exec.contract, t)
              const hitlCount = exec.validationStatuses?.filter(s => s === 'hitl_waiting').length || 0
              const isHitl = exec.status === 'PENDING_APPROVAL' || hitlCount > 0
              const relTime = formatRelativeTime(exec.timestamp, t)

              return (
                <tr
                  key={exec.id}
                  onClick={() => onSelect(exec.id)}
                  className={`border-b border-border/50 hover:bg-bg-primary/50 cursor-pointer transition-colors ${
                    isHitl ? 'border-s-2 border-s-warning' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono text-accent text-xs">{exec.processId}</td>
                  <td className="py-3 px-4 text-text-primary">{exec.memberName}</td>
                  <td className="py-3 px-4 text-text-muted text-xs">{exec.fundTypeLabel}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.pulse ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                        </span>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      )}
                      {t(statusCfg.tKey)}
                      {hitlCount > 0 && ` (${hitlCount})`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityCfg.color}`}>
                      {t(`priority.${exec.priority}`, exec.priority)}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-xs font-mono ${sla.color}`}>
                    {sla.warn && !sla.breached && <span className="me-1">⚠️</span>}
                    {sla.breached && <span className="me-1">🔴</span>}
                    {sla.text}
                  </td>
                  <td className="py-3 px-4 text-xs text-text-muted">{relTime}</td>
                  <td className="py-3 px-4 text-xs text-text-muted">{exec.useCaseLabel}</td>
                  <td className="py-3 px-2 text-center" onClick={e => e.stopPropagation()}>
                    {exec.easymazeStatus === 'synced' ? (
                      <a
                        href={`https://app.dev-easymaze.mazemateapp.com/services/${exec.easymazeServiceId || exec.easymazeServiceNumber || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success hover:text-success/80 text-xs transition-colors"
                        title={`Open Service #${exec.easymazeServiceNumber || exec.easymazeServiceId || ''} in Easymaze`}
                      >
                        🔗
                      </a>
                    ) : exec.easymazeStatus === 'failed' ? (
                      <span className="text-error text-xs" title={exec.easymazeError || 'Failed'}>⚠️🔗</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-3 text-text-muted hover:text-accent transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && executions.length > 0 && (
          <div className="py-8 text-center text-text-muted text-sm">
            {t('executions.noMatch')}
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setFundTypeFilter('') }}
              className="ms-2 text-accent hover:underline"
            >
              {t('executions.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, bg, dot, pulse, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`${bg} rounded-xl border p-4 text-center cursor-pointer transition-all ${
        active ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-text-muted/30'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {dot && (
          <span className="relative flex h-2 w-2">
            {pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`} />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
          </span>
        )}
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}
